import multer from "multer";

/**
 * Multer storage configuration for file upload to cloudinary.
 * @type {Object}
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

export const upload = multer({ 
    storage, 
})