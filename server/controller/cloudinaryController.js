import { v2 as cloudinary } from "cloudinary";

export const uploadMedia = async (mediaPath, folderName, next) => {
  // Use the uploaded file's name as the asset's public ID and
  // allow overwriting the asset with new versions
  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    folder: folderName,
  };

  try {
    // Upload the image
    const result = await cloudinary.uploader.upload(mediaPath, options);
    console.log("Media uploaded sucessfully");
    return result;
  } catch (error) {
    next(error);
  }
};
