import { v2 as cloudinary } from "cloudinary";
import ErrorHandler from "../middlewares/error.js";
import logger from "../logger/index.js";

/**
 * 
 * @param {string} mediaPath 
 * @param {string} folderName 
 * @param {string} public_id 
 * @returns result of media upload
 */
export const uploadMedia = async (mediaPath, folderName, public_id) => {

  if(!mediaPath || !folderName || !public_id) throw new ErrorHandler(`Insuffecient details to initiate media upload`);

  /**
   * configuring how we want to upload file,
   * public_id is used to differentiate files
   */
  const options = {
    folder: folderName,
    public_id,
    use_filename: false, 
    unique_filename: false, 
    overwrite: true, 
  };

  const result = await cloudinary.uploader.upload(mediaPath, options);

  logger.info(`media uploaded in ${folderName}`);
  return result;
};

/**
 * 
 * @param {string} public_id 
 * @returns result of delete media operation of cloudinary
 */
export const deleteMedia = async (public_id) => {

  if(!public_id) {
    throw new Error(`Cannot delete media, public id missing`);
  }

  const result = await cloudinary.uploader.destroy(public_id);

  if (result.result === "ok") {
    logger.info(`Media deleted public_id: ${public_id}.`);
    return result;
  } else {
    logger.error(`Failed to delete media with public_id: ${public_id}`);
  }

};