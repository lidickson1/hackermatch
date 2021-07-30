let db;
let user_info;
let match_info;
let matches = [];

$(document).ready(function () {
    //front end initialization
    $(".tabs").tabs();
    $("#popup").modal({ dismissible: false });
    $("#contact_modal").modal();
    $(".dropdown-trigger").dropdown();

    //back end initialization
    // Your web app's Firebase configuration
    let firebaseConfig = {
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
    firebase.analytics();
    db = firebase.firestore();

    if (sessionStorage.getItem("tab") != null) {
        $(".tabs").tabs("select", sessionStorage.getItem("tab"));
    }

    if (sessionStorage.getItem("user") === null) {
        $("#login").show();
        $("#profile_title").text("Register Account");
        $("#profile_submit").text("Register");
        $("#logout").hide();
        $(".restricted_tab").addClass("disabled");
        $("#keywords").chips({
            placeholder: "Enter a keyword",
            secondaryPlaceholder: "Press enter",
        });
    } else {
        $("#profile_title").text("Account Details");
        $("#profile_submit").text("Save");
        $(".tabs").tabs("select", "profile");

        //get user info
        db.collection("users")
            .doc(sessionStorage.getItem("user"))
            .get()
            .then((doc) => {
                user_info = doc.data();
                $("#name").val(user_info.name);
                $("#profile_email").val(user_info.email);
                $("#profile_password").val(user_info.password);
                $("#age").val(user_info.age);
                $("#profile_description").val(user_info.description);

                $("#technologies")
                    .children()
                    .each(function () {
                        if (
                            user_info.technologies.includes(
                                $(this).find("span").text()
                            )
                        ) {
                            $(this).find("input").attr("checked", true);
                        }
                    });

                for (let i = 0; i < user_info.contacts.length; i++) {
                    $("#contact_list").append(
                        construct_contact(
                            user_info.contacts[i].type,
                            user_info.contacts[i].contact,
                            true
                        )
                    );
                }
                loadDelete();

                let keywords = [];
                for (let i = 0; i < user_info.keywords.length; i++) {
                    keywords.push({ tag: user_info.keywords[i] });
                }
                $("#keywords").chips({
                    placeholder: "Enter a keyword",
                    secondaryPlaceholder: "Press enter",
                    data: keywords,
                });

                M.updateTextFields();

                //get matching

                get_matching().then((match) => {
                    if (match != null) {
                        match_info = match;
                        console.log(match);
                        $("#match_name").text(match.name);
                        $("#match_description").text(match.description);
                        for (let i = 0; i < match.technologies.length; i++) {
                            $("#match_technologies").append(
                                '<div class="chip">' +
                                    match.technologies[i] +
                                    "</div>"
                            );
                        }
                    } else {
                        $("#match_name").text("No Matches found!");
                        $("#match_description").text("RIP I guess!");
                    }
                });

                get_matches().then(() => {
                    console.log(matches);
                    //load matches
                    for (let i = 0; i < matches.length; i++) {
                        let chips = "";
                        for (
                            let j = 0;
                            j < matches[i].technologies.length;
                            j++
                        ) {
                            chips +=
                                '<div class="chip">' +
                                matches[i].technologies[j] +
                                "</div>";
                        }
                        $("#matches_list").append(
                            '<div class="row"><div class="card horizontal"><div class="card-stacked"><div class="card-content"><h4>' +
                                matches[i].name +
                                "</h4>" +
                                chips +
                                '</div><div class="card-action"><div class="row"><div class="col l6"><a href="#" class="contact_match" data-index=' +
                                i +
                                '>Contact</a></div><div class="col l6"><a href="#" class="unmatch_button" data-index=' +
                                i +
                                ">Unmatch</a></div></div></div></div></div></div>"
                        );
                    }

                    $(".contact_match").click(function () {
                        let index = $(this).attr("data-index");
                        for (
                            let i = 0;
                            i < matches[index].contacts.length;
                            i++
                        ) {
                            $("#match_contact_list").append(
                                construct_contact(
                                    matches[index].contacts[i].type,
                                    matches[index].contacts[i].contact,
                                    false
                                )
                            );
                        }
                        $("#contact_modal").modal("open");
                    });

                    $(".unmatch_button").click(function () {
                        console.log("hehehe");
                        let index = $(this).attr("data-index");
                        db.collection("users")
                            .doc(sessionStorage.getItem("user"))
                            .update({
                                matches:
                                    firebase.firestore.FieldValue.arrayRemove(
                                        matches[index].id
                                    ),
                            })
                            .then(() => location.reload());
                    });
                });

                //check new matches
                if (user_info.inform) {
                    db.collection("users")
                        .doc(sessionStorage.getItem("user"))
                        .update({
                            inform: firebase.firestore.FieldValue.delete(),
                        });
                    alert("You have a new match!");
                }
            });
    }
});

async function get_matches() {
    let snapshot = await db.collection("users").get();
    let user_id = sessionStorage.getItem("user");
    for (let i = 0; i < snapshot.docs.length; i++) {
        let match = snapshot.docs[i].data();
        match.id = snapshot.docs[i].id; //to save space
        //console.log(match.id);
        if (!match.hasOwnProperty("name")) {
            //console.log("invalid data");
            continue;
        }
        //we check for matches here
        if (
            match.hasOwnProperty("matches") &&
            match.matches.includes(user_id) &&
            user_info.hasOwnProperty("matches") &&
            user_info.matches.includes(match.id)
        ) {
            matches.push(match);
        }
    }
    return;
}

async function get_matching() {
    let snapshot = await db.collection("users").get();
    let match;
    let user_id = sessionStorage.getItem("user");
    let foundMatch = false;
    snapshot.docs.every(function (doc) {
        match = doc.data();
        match.id = doc.id; //to save space
        console.log("Attempting to match " + match.id);
        if (!match.hasOwnProperty("name")) {
            console.log("invalid data");
            return true;
        }

        //they cannot be the same person
        if (match.id === user_id) {
            console.log("same person");
            return true;
        }

        //either of them cannot have passed the other already
        if (
            (match.hasOwnProperty("passes") &&
                match.passes.includes(user_id)) ||
            (user_info.hasOwnProperty("passes") &&
                user_info.passes.includes(match.id))
        ) {
            console.log("passed");
            return true;
        }

        //they cannot be a match already
        if (
            user_info.hasOwnProperty("matches") &&
            user_info.matches.includes(match.id)
        ) {
            console.log("matched already");
            return true;
        }

        //keywords score
        if (!match.hasOwnProperty("keywords")) {
            console.log("doesn't even have keywords");
            return true;
        }
        let intersection = user_info.keywords.filter((value) =>
            match.keywords.includes(value)
        );
        if (intersection.length < 2) {
            console.log("not enough keyword score");
            return true;
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
            ...new Set([...user_info.technologies, ...match.technologies]),
        ];
        let techScore = union.length / 6.0;
        console.log("tech score: " + techScore);
        if (techScore < 4 / 6.0) {
            console.log("not enough tech score");
            return true;
        }

        foundMatch = true;
        return false;
    });

    if (foundMatch) {
        return match;
    } else {
        return null;
    }
}

//add match's id to user's matches
$("#match_button").click(function () {
    let user_id = sessionStorage.getItem("user");
    db.collection("users")
        .doc(user_id)
        .update({
            matches: firebase.firestore.FieldValue.arrayUnion(match_info.id),
        })
        .then(() => {
            //getting the match's information again because it might have changed while the user was deciding
            let ref = db.collection("users").doc(match_info.id);
            ref.get()
                .then(function (doc) {
                    if (
                        doc.data().hasOwnProperty("matches") &&
                        doc.data().matches.includes(user_id)
                    ) {
                        //inform other person that we have matched
                        ref.set(
                            {
                                inform: true,
                            },
                            { merge: true }
                        );
                        sessionStorage.setItem("tab", "matches");
                        alert("Its a match!");
                    }
                })
                .then(() => location.reload());
        });
});

//add match's id to user's passes
$("#pass_button").click(function () {
    db.collection("users")
        .doc(sessionStorage.getItem("user"))
        .update({
            passes: firebase.firestore.FieldValue.arrayUnion(match_info.id),
        })
        .then(() => location.reload());
});

$(".tab").click(function () {
    sessionStorage.setItem("tab", $(this).find("a").attr("href").substring(1));
});

$("#logout").click(function () {
    sessionStorage.removeItem("user");
    location.reload();
});

$("#login_form").submit(function () {
    db.collection("users")
        .where("email", "==", $("#login_email").val())
        .where("password", "==", $("#login_password").val())
        .get()
        .then(function (snapshot) {
            if (snapshot.empty) {
                $("#modal_message").text("Account doesn't exist!");
                $("#popup").modal("open");
                throw Error("account doesn't exist!");
            } else {
                snapshot.docs.every(function (doc) {
                    sessionStorage.setItem("user", doc.id);
                    sessionStorage.setItem("tab", "account");
                    alert("Login successful!");
                    location.reload();
                    //we can assume every user has a unique email and password combination
                });
            }
        })
        .catch(function (error) {
            console.log("Error getting documents: ", error);
        });
    return false; //prevent the page from reloading
});

async function update_account(ref) {
    console.log(ref);
    //parse technologies checkboxes
    let technologies = [];
    $("#technologies")
        .children()
        .each(function () {
            if ($(this).find("input").is(":checked")) {
                technologies.push($(this).find("span").text());
            }
        });
    //parse contact methods
    let contacts = [];
    $("#contact_list")
        .children()
        .each(function () {
            if ($(this).find(".material-icons.circle").length > 0) {
                if ($(this).find(".material-icons.circle").text() == "email") {
                    contacts.push({
                        type: "email",
                        contact: $(this).find("p").text(),
                    });
                } else if (
                    $(this).find(".material-icons.circle").text() == "phone"
                ) {
                    contacts.push({
                        type: "phone",
                        contact: $(this).find("p").text(),
                    });
                }
            } else {
                //discord
                contacts.push({
                    type: "discord",
                    contact: $(this).find("p").text(),
                });
            }
        });
    let keywords = [];
    for (
        let i = 0;
        i < M.Chips.getInstance($("#keywords")).chipsData.length;
        i++
    ) {
        keywords.push(M.Chips.getInstance($("#keywords")).chipsData[i].tag);
    }
    await ref.set(
        {
            name: $("#name").val(),
            email: $("#profile_email").val(),
            password: $("#profile_password").val(),
            contacts: contacts,
            technologies: technologies,
            age: parseInt($("#age").val()),
            description: $("#profile_description").val(),
            keywords: keywords,
        },
        { merge: true }
    );
}

$("#profile_form").submit(function () {
    if (M.Chips.getInstance($("#keywords")).chipsData.length === 0) {
        $("#modal_message").text("Please enter at least 1 keyword");
        $("#popup").modal("open");
        return false;
    }
    if ($("#contact_list").children().length === 0) {
        $("#modal_message").text("Please enter at least 1 contact method");
        $("#popup").modal("open");
        return false;
    }
    if (sessionStorage.getItem("user") === null) {
        //register new account
        let ref;
        db.collection("users")
            .where("email", "==", $("#profile_email").val())
            .get()
            .then(function (snapshot) {
                if (!snapshot.empty) {
                    $("#modal_message").text("Account already exists!");
                    $("#popup").modal("open");
                    throw Error("account already exists!"); //stops the following promise to be executed
                }
            })
            .then(() => {
                ref = db.collection("users").doc();
                return update_account(ref); //because the function returns a promise
            })
            .then(() => {
                sessionStorage.setItem("user", ref.id);
                sessionStorage.setItem("tab", "account");
                alert("Registration successful!");
                location.reload();
            });
    } else {
        //update account information
        update_account(
            db.collection("users").doc(sessionStorage.getItem("user"))
        ).then(() => {
            console.log("updated");
            location.reload();
        });
    }
    return false; //prevent the page from reloading before promise is resolved
});

function loadDelete() {
    $(".delete_contact").click(function () {
        let target = $(this).closest("li");
        target.hide("slow", function () {
            target.remove();
        });
        // $(this).closest("li").remove();
    });
}

$(".contact_type").click(function () {
    $("#select_contact").text($(this).text());
});

function construct_contact(type, contact, deletable) {
    let icon;
    if (type === "email") {
        icon = '<i class="material-icons circle">email</i>';
    } else if (type === "phone") {
        icon = '<i class="material-icons circle">phone</i>';
    } else if (type === "discord") {
        icon =
            '<img src="https://cdn0.iconfinder.com/data/icons/free-social-media-set/24/discord-512.png" alt="" class="circle" />';
    }
    let trash = deletable
        ? '<i class="material-icons delete_contact">delete</i>'
        : "";
    return (
        '<li class="collection-item avatar">' +
        icon +
        "<p>" +
        contact +
        "</p>" +
        '<a href="#!" class="secondary-content">' +
        trash +
        "</a>" +
        "</li>"
    );
}

$("#add_contact").click(function () {
    if ($("#select_contact").text() === "Select Contact Type") {
        $("#modal_message").text("Please choose a contact type!");
        $("#popup").modal("open");
        return;
    }
    if (!$("#contact_input").val().trim()) {
        $("#modal_message").text("Please fill in the required field!");
        $("#popup").modal("open");
        return;
    }
    let type;
    if ($("#select_contact").text() === "Email") {
        type = "email";
    } else if ($("#select_contact").text() === "Phone Number") {
        type = "phone";
    } else if ($("#select_contact").text() === "Discord") {
        type = "discord";
    }
    $("#contact_list").append(
        construct_contact(type, $("#contact_input").val(), true)
    );
    loadDelete();
    $("#select_contact").text("Select Contact Type");
    $("#contact_input").val("");
});

//TODO move backend code to backend, use express (see canmypeteat for template)
//TODO if you logout, the account details will remain in the register section
//TODO show all profile details in matches tab as well
//TODO ability to add pictures (multiple if possible)
