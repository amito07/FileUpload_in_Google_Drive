import express from 'express';
const app = express();
import OAuth2Data from './credentials.json' assert {type: "json"};
import {google} from 'googleapis';
import upload from './Utils/multer.js';
import fs from 'fs';

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URI = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
)

var authUser = false;
var name,picture;
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile"

app.set("view engine","ejs")

app.get('/',(req,res)=>{
    if(!authUser){
        const url = oAuth2Client.generateAuthUrl({
            access_type:'offline',
            scope:SCOPES
        })
        res.render("index",{url:url})
    }else{
        const oAuthUserInfo = google.oauth2({
            auth: oAuth2Client,
            version:'v2'
        })

        oAuthUserInfo.userinfo.get((err,response)=>{
            if(err) throw err
            else{
                name = response.data.name;
                picture = response.data.picture;
                res.render("success",{name:name,pic:picture,success:false})
            }
        })

    }
})

app.get('/google/callback',(req,res)=>{
    const code = req.query.code

    if(code){
        oAuth2Client.getToken(code,(err,tokens)=>{
            if(err){
                console.log("Error in Authentication")
            }else{
                console.log("Successfully Authenticated")
                oAuth2Client.setCredentials(tokens)
                authUser = true
                res.redirect('/')
            }

        })

    }

})

app.post('/upload',async(req,res)=>{
    var fileInfo;
    upload(req,res,(err)=>{
        if(err) throw err

        const drive = google.drive({auth: oAuth2Client,version:'v3'})

        const filemetadata = {
            name: req.file.filename
        }
    
        const media = {
            mimeType: req.file.mimetype,
            body: fs.createReadStream(req.file.path)
        }
    
        drive.files.create({
            resource: filemetadata,
            media: media,
            fields: "id"
        },(err,file)=>{
            if(err) throw err
    
            //delete the file after uploads
            fs.unlinkSync(req.file.path)
            res.render("success",{name:name,pic:picture,success:true})
        })
    })

})

app.get('/logout',(req,res)=>{
    authUser = false;
    res.redirect('/')
})

app.listen(5000,()=>{
    console.log("server is running")
})