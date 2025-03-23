const express =  require("express");
const AWS = require("aws-sdk");
const multer = require("multer");
const dotenv = require("dotenv").config();
const app = express();
const upload = multer();

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(upload.fields([]));

app.use(express.static("./views"));
app.set("view engine", "ejs");

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

            res.render("index", {
                products: data.Items
            })

        })
    } catch (error) {
        res.send("error");
    }
})


app.post("/", (req, res) => {
    try {
        const {ma_sp, ten_sp, so_luong} = req.body;

        docClient.put({
            TableName,
            Item: {
                ma_sp,
                ten_sp,
                so_luong: parseInt(so_luong),
            }
        }, (err, data)=>{
            if(err) res.send("error");
            res.redirect("/");
        });
    } catch (error) {
        res.send("error");
    }
})

app.post("/delete", (req, res) => {
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