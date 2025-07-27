import multer from "multer";

const fileUpload = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    const name = Date.now() + "_" + file.originalname;
    cb(null, name);
  },
});

const uploadFile = multer({ storage: fileUpload });

export default uploadFile;
