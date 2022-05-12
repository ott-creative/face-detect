(function () {
    // The width and height of the captured photo. We will set the
    // width to the value defined here, but the height will be
    // calculated based on the aspect ratio of the input stream.

    //var width = window.screen.width * 1.2;    // We will scale the photo width to this
    //var width = 640;
    var height = window.screen.height * 0.7;
    //var height = 128;
    console.log("height: " + height);

    var width = 0;     // This will be computed based on the input stream

    // |streaming| indicates whether or not we're currently streaming
    // video from the camera. Obviously, we start at false.

    var streaming = false;

    // The various HTML elements we need to configure or control. These
    // will be set by the startup() function.

    var video = null;
    var photo_canvas = null;
    var photo = null;
    var startbutton = null;
    var output = null
    var face_detector = null;
    var face_canvas = null;
    var is_scan = false;

    //const net_tiny = new faceapi.TinyFaceDetector();
    //const net_landMark = new faceapi.FaceLandmark68Net();

    //var cover = document.getElementById('cover');
    //cover.style["border"] = "20px solid #000";
    //cover.style["border-radius"] = "80%";

    function showViewLiveResultButton() {
        if (window.self !== window.top) {
            // Ensure that if our document is in a frame, we get the user
            // to first open it in its own tab or window. Otherwise, it
            // won't be able to request permission for camera access.
            document.querySelector(".contentarea").remove();
            const button = document.createElement("button");
            button.textContent = "View live result of the example code above";
            document.body.append(button);
            button.addEventListener('click', () => window.open(location.href));
            return true;
        }
        return false;
    }

    function init() {
        Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('models'),
            //faceapi.nets.faceRecognitionNet.loadFromUri('models'),
            //faceapi.nets.faceExpressionNet.loadFromUri('models')
            //net_tiny.loadFromUri('models'),
            //net_landMark.loadFromUri('models')
            //modelLoadTiny()
        ]).then(startup).catch(err => alert(err));
    }

    async function modelLoadTiny() {
        const net_tiny = new faceapi.TinyFaceDetector();
        const res = await axios.get('models/tiny_face_detector_model-shard1', { responseType: 'arraybuffer' })
        console.log(res);
        const weights = new Float32Array(res.data)
        net_tiny.load(weights)
    }

    function startup() {
        if (showViewLiveResultButton()) { return; }
        video = document.getElementById('video');
        photo_canvas = document.getElementById('canvas-photo');
        photo = document.getElementById('photo');
        startbutton = document.getElementById('startbutton');
        output = document.getElementById('output');

        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
            .then(function (stream) {
                video.srcObject = stream;
                video.play();
            })
            .catch(function (err) {
                console.log("An error occurred: " + err);
            });

        video.addEventListener('canplay', function (ev) {
            if (!streaming) {
                console.log("video size:" + video.videoWidth + "x" + video.videoHeight);
                //height = video.videoHeight / (video.videoWidth / width);
                //height = window.screen.height * 0.9;
                width = video.videoWidth / (video.videoHeight / height);

                // Firefox currently has a bug where the height can't be read from
                // the video, so we will make assumptions if this happens.

                if (isNaN(height)) {
                    height = width / (4 / 3);
                }

                video.setAttribute('width', width);
                video.setAttribute('height', height);
                photo_canvas.setAttribute('width', width);
                photo_canvas.setAttribute('height', height);
                streaming = true;
            }
        }, false);

        video.addEventListener('playing', () => {
            console.log("video playing...");
            if (!face_canvas) {
                face_canvas = faceapi.createCanvasFromMedia(video)
                face_canvas.id = "faceapi-canvas";


                document.body.append(face_canvas)
            }

            enableFaceDetection();
        })

        startbutton.addEventListener('click', function (ev) {
            enableFaceDetection();
        }, false);

        //clearphoto();
    }

    function disableFaceDetection() {
        is_scan = false;
        video.pause();
        video.style.display = "none";
        document.getElementById('faceapi-canvas').style.display = "none";
        clearInterval(face_detector);
        face_detector = undefined;
    }

    function enableFaceDetection() {
        is_scan = true;
        console.log("enableFaceDetection");
        output.style.display = "none";
        video.style.display = "block";
        video.play();
        document.getElementById('faceapi-canvas').style.display = "block";
        const displaySize = { width: video.width, height: video.height }
        console.log("displaySize: ", displaySize);
        faceapi.matchDimensions(face_canvas, displaySize)
        var success_detect_count = 0;

        face_detector = setInterval(async () => {
            if (!is_scan) {
                clearInterval(face_detector);
                return;
            }

            //const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
            //const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
            const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
            //const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());

            if (detection) {
                //console.log("detection: ", detection.detection._score);
                if (detection.detection._score > 0.96) {
                    success_detect_count += 1;
                    console.log("detection: ", detection.detection._score, success_detect_count);
                    // should take photo here
                    if (success_detect_count >= 3) {
                        takePicture();
                    }
                } else {
                    success_detect_count = 0;
                }
                //const resizedDetections = faceapi.resizeResults(detections, displaySize)
                const resizedDetections = faceapi.resizeResults(detection, displaySize)
                face_canvas.getContext('2d').clearRect(0, 0, face_canvas.width, face_canvas.height)
                faceapi.draw.drawDetections(face_canvas, resizedDetections)
                faceapi.draw.drawFaceLandmarks(face_canvas, resizedDetections)
                //faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
            }
        }, 500)
    }

    // Fill the photo with an indication that none has been
    // captured.

    function clearPhoto() {
        var context = photo_canvas.getContext('2d');
        context.fillStyle = "#AAA";
        context.fillRect(0, 0, photo_canvas.width, photo_canvas.height);

        //var data = photo_canvas.toDataURL('image/png');
        //photo.setAttribute('src', data);
    }

    // Capture a photo by fetching the current contents of the video
    // and drawing it into a canvas, then converting that to a PNG
    // format data URL. By drawing it on an offscreen canvas and then
    // drawing that to the screen, we can change its size and/or apply
    // other changes before drawing it.

    function takePicture() {
        // disable video, enable static pic
        disableFaceDetection();
        clearPhoto();
        var context = photo_canvas.getContext('2d');
        photo_canvas.width = width;
        photo_canvas.height = height;
        context.drawImage(video, 0, 0, width, height);

        var data = photo_canvas.toDataURL('image/png');
        //console.log("data: ", data);
        photo.setAttribute('src', data);
        photo.setAttribute('width', window.screen.width * 0.9);


        output.style.display = "block";
        console.log("take picture done");
    }

    // Set up our event listener to run the startup process
    // once loading is complete.
    window.addEventListener('load', init, false);
})();

