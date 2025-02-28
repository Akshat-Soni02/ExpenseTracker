import { v2 as cloudinary } from "cloudinary";

export const uploadMedia = async (mediaPath, folderName, public_id) => {
  
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
  }
};
