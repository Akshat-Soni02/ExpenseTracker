import { v2 as cloudinary } from "cloudinary";

export const uploadMedia = async (mediaPath, folderName, public_id) => {
  console.log("Uploading Media");
  const options = {
    folder: folderName,
    public_id, // we are differentiating the files through their public id
    use_filename: false, 
    unique_filename: false, 
    overwrite: true, 
};

  try {
    const result = await cloudinary.uploader.upload(mediaPath, options);
    console.log("Media uploaded sucessfully");
    return result;
  } catch (error) {
    console.log("Error uploading media", error);
    throw error;
  }
};

export const deleteMedia = async (public_id) => {
  try {
    console.log("Deleting Media");
    const result = await cloudinary.uploader.destroy(public_id);
    if (result.result === "ok") {
      console.log(`Media with public_id: ${public_id} deleted successfully.`);
      return result;
    } else {
      console.warn(`Failed to delete media with public_id: ${public_id}`);
    }
  } catch (error) {
    console.error("Error deleting media:", error);
    throw error;
  }
};