const express = require("express");
const app = express();
// const bodyParser = require("body-parser");
// const MongoClient = require("mongodb").MongoClient;
// const url =
// "mongodb+srv://dickson:123@canmypeteat-he5mo.mongodb.net/test?retryWrites=true&w=majority";
const firebase = require("firebase");
// import firebase from "firebase/app";
// import "firebase/firestore";
const cors = require("cors");

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

app.use(express.static(__dirname));
// , function (req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header(
//         "Access-Control-Allow-Headers",
//         "Origin, X-Requested-With, Content-Type, Accept"
//     );
//     next();
// });

app.use(cors());
app.options("*", cors());

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
    console.log(request.body);
    db.collection("users")
        .where("email", "==", request.body.email)
        .where("password", "==", request.body.password)
        .limit(1)
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                response.status(401).send("Login failed!");
            } else {
                const document = snapshot.docs[0].data();
                document.id = snapshot.docs[0].id;
                response.status(200).json(document);
            }
        });
    // get_document(request.body.id).then((document) => {
    //     if (document === undefined) {
    //         response.status(401).send("Login failed!");
    //     } else {
    //         response.status(200).json(document);
    //     }
    // });
});

app.post("/info", function (request, response) {
    get_document(request.body.id).then(([reference, document]) => {
        if (reference === undefined) {
            response.status(401).send("Document with given id doesn't exist!");
        } else {
            response.status(200).json(document);
        }
    });
});

//used when a user is informed of and acknowledged that they have received a new match
app.post("/informed", function (request, response) {
    get_document(request.body.id).then(([reference, document]) => {
        if (reference === undefined) {
            response.status(401).send("User not found");
        } else if (!document.inform) {
            response
                .status(409)
                .send("User was already informed and acknowledged");
        } else {
            reference.update({
                inform: firebase.firestore.FieldValue.delete(),
            });
            response.status(200);
        }
    });
});

app.post("/unmatch", function (request, response) {
    get_document(request.body.id).then(([reference, document]) => {
        if (reference === undefined) {
            response.status(401).send("Document with given id doesn't exist!");
        } else {
            reference.update({
                matches: firebase.firestore.FieldValue.arrayRemove(
                    request.body.match_id
                ),
            });
            response
                .status(200)
                .send(
                    "Unmatched " +
                        request.body.match_id +
                        " from the matches of " +
                        request.body.id
                );
        }
    });
});

app.post("/pass", function (request, response) {
    get_document(request.body.id).then(([reference, document]) => {
        if (reference === undefined) {
            response.status(401).send("Document with given id doesn't exist!");
        } else {
            reference.update({
                passes: firebase.firestore.FieldValue.arrayUnion(
                    request.body.match_id
                ),
            });
            //note that when we pass here, the other person (who initiated the match) will still have this person (the passer) in their matches array
            //thus, if for some reason the passer unpasses, they can decide to match
            response
                .status(200)
                .send(request.body.id + " passed " + request.body.match_id);
        }
    });
});

app.post("/update", function (request, response) {
    db.collection("users").doc(request.body.id).set(
        {
            name: request.body.name,
            email: request.body.email,
            password: request.body.password,
            contacts: request.body.contacts,
            technologies: request.body.technologies,
            age: request.body.age,
            description: request.body.description,
            keywords: request.body.keywords,
        },
        { merge: true }
    );
    // .then((reference) => {
    // response.status(401).send("Document with given id doesn't exist!");
    // reference.set(
    //     {
    //         name: request.body.name,
    //         email: request.body.email,
    //         password: request.body.password,
    //         contacts: request.body.contacts,
    //         technologies: request.body.technologies,
    //         age: request.body.age,
    //         description: request.body.description,
    //         keywords: request.body.keywords,
    //     },
    //     { merge: true }
    // );
    response.status(200).send(request.body.id + " updated");
});

app.post("/can-register", function (request, response) {
    db.collection("users")
        .where("email", "==", request.body.email)
        .get()
        .then(function (snapshot) {
            if (!snapshot.empty) {
                response.status(401).send("Account already exists!");
            } else {
                response.status(200).send(db.collection("users").doc().id);
            }
        });
});

app.post("/match", function (request, response) {
    get_document(request.body.id).then(([reference, document]) => {
        if (reference === undefined) {
            response.status(401).send("Document with given id doesn't exist!");
        } else {
            reference.update({
                matches: firebase.firestore.FieldValue.arrayUnion(
                    request.body.match_id
                ),
            });
            get_document(request.body.match_id).then(
                ([match, match_document]) => {
                    //only if the other person has chosen to match, do we then inform
                    if (
                        match_document.hasOwnProperty("matches") &&
                        match_document.matches.includes(request.body.id)
                    ) {
                        match.set(
                            {
                                inform: true,
                            },
                            { merge: true }
                        );
                        response.status(200).json({ inform: true });
                    } else {
                        response.status(200).json({ inform: false });
                    }
                }
            );
            // response
            //     .status(200)
            //     .send(
            //         request.body.id + " matched with " + request.body.match_id
            //     );
        }
    });
});

app.post("/matches", function (request, response) {
    get_document(request.body.id).then(([reference, document]) => {
        if (reference === undefined) {
            response.status(401).send("Document with given id doesn't exist!");
        } else if (
            !document.hasOwnProperty("matches") ||
            document.matches.length === 0
        ) {
            response.status(200).json({ matches: [] });
        } else {
            db.collection("users")
                .where(
                    firebase.firestore.FieldPath.documentId(),
                    "in",
                    document.matches
                )
                .get()
                .then((snapshot) =>
                    response.status(200).json({
                        matches: snapshot.docs.map((element) => {
                            const match_document = element.data();
                            match_document.id = element.id;
                            return match_document;
                        }),
                    })
                );
        }
    });
});

app.post("/matching", function (request, response) {
    get_document(request.body.id).then(([reference, document]) => {
        if (reference === undefined) {
            response.status(401).send("Document with given id doesn't exist!");
        } else {
            db.collection("users")
                .where(
                    firebase.firestore.FieldPath.documentId(),
                    "!=",
                    request.body.id
                )
                .get()
                .then(function (snapshot) {
                    for (const doc of snapshot.docs) {
                        const match = doc.data();
                        match.id = doc.id;
                        //either of them cannot have passed the other already
                        if (
                            (match.hasOwnProperty("passes") &&
                                match.passes.includes(request.body.id)) ||
                            (document.hasOwnProperty("passes") &&
                                document.passes.includes(match.id))
                        ) {
                            console.log("passed");
                            continue;
                        }

                        //they cannot be a match already
                        if (
                            document.hasOwnProperty("matches") &&
                            document.matches.includes(match.id)
                        ) {
                            console.log("matched already");
                            continue;
                        }

                        //keywords score
                        if (!match.hasOwnProperty("keywords")) {
                            console.log("doesn't even have keywords");
                            continue;
                        }
                        let intersection = document.keywords.filter((value) =>
                            match.keywords.includes(value)
                        );
                        if (intersection.length < 2) {
                            console.log("not enough keyword score");
                            continue;
                        }
                        // //0 is none, 1 is all keywords were matched
                        // let keywordScore =
                        //     (intersection.length * 2) /
                        //     parseFloat(user_info.keywords.length + match.keywords.length);
                        // console.log("Keyword score: " + keywordScore);
                        // if (keywordScore < 2 / 3.0) {
                        //     console.log("not enough keyword score");
                        //     return true;
                        // }

                        //tech score
                        let union = [
                            ...new Set([
                                ...document.technologies,
                                ...match.technologies,
                            ]),
                        ];
                        let techScore = union.length / 6.0;
                        console.log("tech score: " + techScore);
                        if (techScore < 4 / 6.0) {
                            console.log("not enough tech score");
                            continue;
                        }

                        response.status(200).json(match);
                        return;
                    }
                    response.status(200).json(null);
                });
        }
    });
});

app.listen(app.get("port"));

async function get_document(id) {
    const reference = db.collection("users").doc(id);
    const snapshot = await reference.get();
    if (snapshot.exists) {
        return [reference, snapshot.data()];
    } else {
        return [undefined, undefined];
    }
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

// get_document("MFw1Tt1lG3dmt0bMwIr").then(([foo, bar]) => {
//     console.log(foo);
//     console.log(bar);
// });
