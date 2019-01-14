using IKnowYouAPI.Models;
using IKnowYouAPI.Services;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.ProjectOxford.Face;
using Microsoft.ProjectOxford.Face.Contract;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace IKnowYouAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[EnableCors("Development")]
    public class FaceController : ControllerBase
    {
        private readonly FaceAPIConfiguration _configuration;
        private readonly IFaceService _faceService;
        private readonly string _personGroupId;
        private readonly IFaceServiceClient _faceServiceClient;

        public FaceController(IOptions<FaceAPIConfiguration> configuration, IFaceService faceService)
        {
            _configuration = configuration.Value;
            _faceService = faceService;
            _personGroupId = _configuration.PersonGroupId;
            _faceServiceClient = new FaceServiceClient(_configuration.ApiKey, _configuration.ApiRoot);
        }
        
        [HttpPost]
        [RequestSizeLimit(4194304)] // 4 MB (Max image size that can be analyzed by Cognitive Services)
        public async Task<HttpResponseMessage> IdentifyPerson(NewFace faceData)
        {
            // Attempt to recognize the person in the photo (which is sent over the wire as a Base64 string)
            var people = new List<string>();

            var byteArray = Convert.FromBase64String(faceData.ImageData);
            Guid[] faceIds;
            Face[] faces;
            try
            {
                using (Stream s = new MemoryStream(byteArray))
                {
                    faces = await _faceServiceClient.DetectAsync(s);
                }
                if (faces.Length == 0)
                {
                    // No person found in the photo
                    return new HttpResponseMessage(HttpStatusCode.ExpectationFailed);
                }
                faceIds = faces.Select(face => face.FaceId).ToArray();
            }
            catch (Exception e)
            {
                // Error in the request to Cognitive Services to detect the face
                if (e is FaceAPIException fe)
                {
                    if (fe.HttpStatus.Equals(HttpStatusCode.TooManyRequests))
                    {
                        return new HttpResponseMessage(HttpStatusCode.TooManyRequests);
                    }
                }
                return new HttpResponseMessage(HttpStatusCode.InternalServerError);
            }

            bool unknownPersonFound = false;
            var confidence = 0.7f;
            var maxNumOfCandidates = 5;
            var results = await _faceServiceClient.IdentifyAsync(_personGroupId, faceIds, confidence, maxNumOfCandidates);
            int index = 0;
            foreach (var identifyResult in results)
            {
                if (identifyResult.Candidates.Length == 0)
                {
                    // Didn't recognize a person
                    unknownPersonFound = true;
                }
                else
                {
                    // Get the top candidate for this face
                    var candidateId = identifyResult.Candidates[0].PersonId;
                    var person = await _faceServiceClient.GetPersonAsync(_personGroupId, candidateId);

                    // Crop the full image to the specified face
                    var faceOutline = faces[index].FaceRectangle;
                    var croppedImage = _faceService.CropImageToFace(byteArray, faceOutline.Left, faceOutline.Top, faceOutline.Width, faceOutline.Height);
                    using (Stream stream = new MemoryStream(croppedImage))
                    {
                        try
                        {
                            // Add the face to the list of person's faces
                            var addPersonFaceTask = _faceServiceClient.AddPersonFaceAsync(_personGroupId, person.PersonId, stream);
                            addPersonFaceTask.Wait();
                        }
                        catch (Exception e)
                        {
                            if (e.InnerException is FaceAPIException fe)
                            {
                                if (fe.HttpStatus == HttpStatusCode.BadRequest)
                                {
                                    // 0 faces or more than 1 face in the cropped photo
                                    return new HttpResponseMessage(HttpStatusCode.InternalServerError);
                                }
                            }
                        }
                            
                    }
                    // Once the face is added, train the person group with the additional face
                    await _faceServiceClient.TrainPersonGroupAsync(_personGroupId);

                    people.Add(person.Name);
                    index++;
                }
            }

            if (people.Count > 0)
            {
                HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);
                response.ReasonPhrase = JsonConvert.SerializeObject(people);
                return response;
            }
            else if (unknownPersonFound)
            {
                return new HttpResponseMessage(HttpStatusCode.NotFound);
            }
            else
            {
                // No person found in the photo
                return new HttpResponseMessage(HttpStatusCode.ExpectationFailed);
            }
        }

        [HttpPut]
        [RequestSizeLimit(4194304)] // 4 MB (Max image size that can be analyzed by Cognitive Services)
        public async Task<HttpResponseMessage> AddNewPerson(NewFace faceData)
        {
            // Null/empty check for each variable
            if ((string.IsNullOrEmpty(faceData.Email)) || (string.IsNullOrEmpty(faceData.ImageData)))
            {
                return new HttpResponseMessage(HttpStatusCode.BadRequest);
            }

            // Confirm that the email is valid
            string email = string.Empty;
            string pattern = @"[a-zA-Z]{2,30}((@rightpoint.com)|(@raizlabs.com)){1}";
            if (Regex.IsMatch(faceData.Email, pattern))
            {
                email = Regex.Match(faceData.Email, pattern).Value;
            }
            else
            {
                return new HttpResponseMessage(HttpStatusCode.Forbidden);
            }

            // Double check to make sure this person doesn't already exist in Cognitive Services
            Guid? personId = null;
            var people = await _faceServiceClient.GetPersonsAsync(_personGroupId);
            foreach (var person in people)
            {
                if (person.Name.Equals(email))
                {
                    // Email already exists
                    personId = person.PersonId;
                }
            }

            // If the email doesn't already exist
            if (personId == null)
            {
                // Create the new person
                CreatePersonResult newPerson = await _faceServiceClient.CreatePersonAsync(_personGroupId, email);
                personId = newPerson.PersonId;
            }
            
            var byteArray = Convert.FromBase64String(faceData.ImageData);
            using (Stream s = new MemoryStream(byteArray))
            {
                try
                {
                    var task = _faceServiceClient.AddPersonFaceAsync(_personGroupId, personId.Value, s);
                    task.Wait();
                }
                catch (Exception e)
                {
                    if (e.InnerException is FaceAPIException fe)
                    {
                        if (fe.HttpStatus == HttpStatusCode.Forbidden)
                        {
                            // This person has hit the maximum number of persisted faces within Cognitive Services.
                            return new HttpResponseMessage(HttpStatusCode.InsufficientStorage);
                        }
                    }
                }
            }
            await _faceServiceClient.TrainPersonGroupAsync(_personGroupId);

            var response = new HttpResponseMessage(HttpStatusCode.OK);
            response.ReasonPhrase = email;
            return response;
        }

    }
}