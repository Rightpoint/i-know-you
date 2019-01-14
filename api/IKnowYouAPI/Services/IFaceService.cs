namespace IKnowYouAPI.Services
{
    public interface IFaceService
    {
        byte[] CropImageToFace(byte[] originalPhoto, int positionX, int positionY, int width, int height);
    }
}
