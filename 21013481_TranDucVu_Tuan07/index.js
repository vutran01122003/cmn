require("dotenv").config();
const express = require("express");
const AWS = require("aws-sdk");
const multer = require("multer");
const {v4: uuid } = require("uuid");
const path = require("path");
const { error } = require("console");

const app = express();

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use(express.static("./views"));
app.set("view engine", "ejs");

const storage = multer.memoryStorage({
    destination(req, file, callback) {
        callback(null, '');
    }
})

function checkFiletype(file, cb) {
    const fileTypes = /jpeg|jpg|png|gif/;
    
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if(extname && mimetype) return cb(null, true);
    return cb("Error: Image Only");
}

const upload = multer({
    storage: storage,
    limits: {fileSize: 2000000},
    fileFilter(req, file, cb) {
        checkFiletype(file, cb)
    }
})

AWS.config.update({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY
});

const TableName = "SanPham";
const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

app.get("/", (req, res) => {
    try {
        dynamodb.scan({
            TableName,
        },(err, data) => {
            if (err) res.send("error");
            console.log(data.Items);
            return res.render("index", {
                products: data.Items
            })

        })
    } catch (error) {
        return res.send("error");
    }
})


app.post("/", upload.single('image'), (req, res) => {
    try {
        const {ma_sp, ten_sp, so_luong} = req.body;
        const image = req.file.originalname.split(".");
        const fileType = image[image.length - 1];
        const filePath = `${uuid() + Date.now().toString()}.${fileType}`;
 
        const params = {
            Bucket: process.env.BUCKET_NAME,
            Key: filePath,
            Body: req.file.buffer,
        }

        const s3 = new AWS.S3();
        s3.upload(params, (error, data) => {
            if(error) return res.send("Internal Server Error");
            docClient.put({
                TableName,
                Item: {
                    ma_sp,
                    ten_sp,
                    so_luong: parseInt(so_luong),
                    image_url: `${process.env.CLOUD_FRONT_URL}\\${filePath}`
                }
            }, (err, data)=>{
                if(err) res.send("error");
                return res.redirect("/");
            });
        });  
    } catch (error) {
        return res.send("error");
    }
})

app.post("/delete", upload.fields([]), (req, res) => {
    try {
        const {ma_sp} = req.body;

        docClient.delete({
            TableName,
            Key: {
                ma_sp
            }
        }, (err, data)=>{
            if(err) res.send('error');
            res.redirect("/")
        });
    } catch (error) {
        res.send("error");
    }
})




app.listen(3000, () => {
    console.log("App is running on port 3000")
})