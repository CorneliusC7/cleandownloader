const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const ytdl = require('ytdl-core')
const fs = require('fs')
const { Server } = require("socket.io");
const io = new Server(server);
const exec = require('child_process').exec
const { v4: uuidv4 } = require('uuid');
//importing modules
app.get('/', (req, res) => {
    fs.readFile('index.html', (err, data) => {
        res.send(data.toString())
    })
});
app.get('/:uud', (req, res) => {
    fs.readFile('downloads/'+'bobby.mp4', (err, data) => {
        setTimeout(()=>{res.download('finish/'+req.params.uud+'.mp4', 'result.mp4');}, 1000)
        console.log(req.params.uud)
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
//website
io.on('connection', (socket) => {
    socket.on('downloadVid', (msg, res) => {
        if(ytdl.validateURL(msg)){
            var stream = ytdl(msg);
            stream.on('info', (info) => {
                socket.emit('name', info.videoDetails.title);     // Tobu - Roots
            });
            console.log(getBasicInfo(msg))
            socket.emit('info', ytdl.getURLVideoID(msg))
            downloadVideo(msg, 'downloads/'+'result.mp4', parseInt(res), (uud) => {
                socket.emit('filename', uud);
            }, (id) => {
                socket.emit('prog', id)
            }, (err) => {
                socket.emit('err')
            });
        }else{
            socket.emit('invalid')
        }
        
    })
    console.log('a user connected');
});  
// download Video
 function getBasicInfo(url){
    let a =  ytdl.getBasicInfo(url)
    a.then(function(result) {
        return result // "Some User token"
    })
}
function downloadVideo(url, filePath, quality, __callBack, __callBack2, erro){
    const video = fs.createWriteStream(`${filePath}`);
    const audio = fs.createWriteStream(`${'downloads/audio.mp3'}`)
    var isFinish = [false,false, false]
    async function getInf(videoID){
        let info = await ytdl.getInfo(videoID);
        let format = ytdl.chooseFormat(info.formats, { quality: quality });
        console.log('Format found!', format['qualityLabel']);
    }
    async function getInfa(videoID){
        let info = await ytdl.getInfo(videoID);
        let format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
        console.log('Format found!', format['qualityLabel']);
    }
    // Listening for the 'finish' event
    video .on('finish', () => {
        console.log('finish')
        isFinish[0] = true;
        __callBack2('1')
    });
    audio .on('finish', () => {
        console.log('finish')
        isFinish[1] = true;
        __callBack2('2')
    });
    const ab = setInterval(() => {
        if(isFinish[0] && isFinish[1] && !isFinish[2]){
            const uud = uuidv4().toString()
            exec('ffmpeg -i downloads/result.mp4 -i downloads/audio.mp3 -acodec copy -vcodec copy finish/'+uud+'.mp4')
            isFinish[2] = true
            __callBack(uud)
        }
    }, 1000)
    setInterval(() => { if (isFinish[2]) {clearInterval(ab)} }, 10)    // Plug it into the ReadableStream
    try{
        ytdl(url, {
            format: "mp4",
            quality: quality
        }).pipe(video);
    }
    catch(err){
        erro(err)
    }
    try{
        ytdl(url, {
            filter: 'audioonly'
        }).pipe(audio);
    }
    catch(err){
        erro(err);
    }
    
    getInf(ytdl.getURLVideoID(url))
    getInfa(ytdl.getURLVideoID(url))
}

//downloadVideo('https://www.youtube.com/watch?v=EAMHQfCGymg', 'downloads/funny.mp4', 'lowestvideo')
