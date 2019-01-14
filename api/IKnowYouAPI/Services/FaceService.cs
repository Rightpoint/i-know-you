using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

namespace IKnowYouAPI.Services
{
    public class FaceService : IFaceService
    {
        public byte[] CropImageToFace(byte[] originalPhoto, int positionX, int positionY, int width, int height)
        {
            Rectangle cropArea = new Rectangle(positionX, positionY, width, height);

            Bitmap croppedBitmap;
            using (MemoryStream stream = new MemoryStream(originalPhoto))
            {
                Bitmap originalBitmap = new Bitmap(stream);
                croppedBitmap = originalBitmap.Clone(cropArea, originalBitmap.PixelFormat);
            }
            
            using (var croppedStream = new MemoryStream())
            {
                croppedBitmap.Save(croppedStream, ImageFormat.Png);
                return croppedStream.ToArray();
            }
        }
    }
}
