const express = require("express");
const app = express();
// const bodyParser = require("body-parser");
// const MongoClient = require("mongodb").MongoClient;
// const url =
// "mongodb+srv://dickson:123@canmypeteat-he5mo.mongodb.net/test?retryWrites=true&w=majority";
const firebase = require("firebase");
// import firebase from "firebase/app";
// import "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBvcNp7bBLjKYYOlwpOkru99K2_876l4Ms",
    authDomain: "hackermatch-5fb6b.firebaseapp.com",
    databaseURL: "https://hackermatch-5fb6b.firebaseio.com",
    projectId: "hackermatch-5fb6b",
    storageBucket: "hackermatch-5fb6b.appspot.com",
    messagingSenderId: "34253622534",
    appId: "1:34253622534:web:c750f99b5c32ccce43e287",
    measurementId: "G-RZNKLP745R",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

app.use(express.json());

app.set("port", process.env.PORT || 3000);

app.use(express.static(__dirname), function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

app.post("/get", function (request, response) {
    getFoods(request.body)
        .then((list) => {
            response.status(200).json(list);
        })
        .catch((error) => {
            response.status(400);
        });
});

app.post("/test", function (request, response) {
    response.status(200).send("success!");
});

app.post("/login", function (request, response) {
    get_document(request.body.id).then((document) => {
        if (document === undefined) {
            response.status(401).send("Login failed!");
        } else {
            response.status(200).json(document);
        }
    });
});

//used when a user is informed of and acknowledged that they have received a new match
app.post("/informed", function (request, response) {
    get_document(request.body.id).then((document) => {
        if (document === undefined) {
            response.status(401).send("User not found");
        } else if (!document.inform) {
            response
                .status(409)
                .send("User was already informed and acknowledged");
        } else {
            get_document_reference(request.body.id).then((reference) =>
                reference.update({
                    inform: firebase.firestore.FieldValue.delete(),
                })
            );
            response.status(200).send("Removed inform from user document");
        }
    });
});

app.listen(app.get("port"));

async function get_document_reference(id) {
    return await db.collection("users").doc(id);
}

async function get_document(id) {
    return (await (await get_document_reference(id)).get()).data();
}

async function getFoods(pet) {
    let query = {};
    query["pets." + pet] = { $exists: true };
    try {
        let result = await db.find(query);
        //db find returns a cursor object, need to convert it to an array
        return result.toArray();
    } catch (error) {
        throw error;
    }
}
