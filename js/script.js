let user_info;
let match_info;
let matches = [];
const url = "http://hackermatch-lidickson1.herokuapp.com/";
// const url = "http://localhost:3000/";

//this functions stringifies the json for us automatically
//https://stackoverflow.com/a/39172380/15974102
//if we use dataType: json, jQuery expects the response to be json as well
//so if the response is plain text/string, jQuery will think it's an error, causing the error function to be run instead of the success one
//thus, I chose to set the contentType instead
$.ajaxPrefilter(function (options, originalOptions) {
    if (options.contentType === "application/json") {
        options.data = JSON.stringify(originalOptions.data || null);
        // options.contentType = "application/json";
    }
});

$(document).ready(function () {
    //front end initialization
    $(".tabs").tabs();
    $("#popup").modal({ dismissible: false });
    $("#contact_modal").modal();
    $(".dropdown-trigger").dropdown();
    $(".tooltipped").tooltip();

    if (sessionStorage.getItem("tab") != null) {
        $(".tabs").tabs("select", sessionStorage.getItem("tab"));
    }

    //ping heroku so that it starts waking up, while the user is registering
    $.ajax({
        url: url + "test",
        type: "POST",
        contentType: "application/json",
        data: {},
        success: function (data) {
            console.log(data);
        },
    });
    if (sessionStorage.getItem("user") === null) {
        $("#login").show();
        $("#profile_title").text("Register Account");
        $("#profile_submit").text("Register");
        $("#logout").hide();
        $(".restricted_tab").addClass("disabled");
        $("#keywords").chips({
            placeholder: "Enter a keyword",
            // secondaryPlaceholder: "Press enter",
        });
    } else {
        $("#profile_title").text("Account Details");
        $("#profile_submit").text("Save");
        $(".tabs").tabs("select", "profile");

        //get user info
        $.ajax({
            url: url + "info",
            type: "POST",
            contentType: "application/json",
            // dataType: "json",
            data: {
                id: sessionStorage.getItem("user"),
            },
            success: function (data) {
                user_info = data;
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
                    // placeholder: "Enter a keyword",
                    // secondaryPlaceholder: "Press enter",
                    data: keywords,
                });

                M.updateTextFields();

                //get matching
                $.ajax({
                    url: url + "matching",
                    type: "POST",
                    contentType: "application/json",
                    data: {
                        id: sessionStorage.getItem("user"),
                    },
                    success: function (match) {
                        if (match != null) {
                            match_info = match;
                            console.log(match);
                            $("#match_name").text(match.name);
                            $("#match_description").text(match.description);
                            for (const technology of match.technologies) {
                                $("#match_technologies").append(
                                    '<div class="chip">' + technology + "</div>"
                                );
                            }
                        } else {
                            $("#match_name").text("No Matches found!");
                            $("#match_description").text("RIP I guess!");
                        }
                    },
                });

                $.ajax({
                    url: url + "matches",
                    type: "POST",
                    contentType: "application/json",
                    data: {
                        id: sessionStorage.getItem("user"),
                    },
                    success: function (data) {
                        matches = data.matches;
                        for (let i = 0; i < matches.length; i++) {
                            let chips = "";
                            for (const technology of matches[i].technologies) {
                                chips +=
                                    '<div class="chip">' +
                                    technology +
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
                            for (const contact of matches[index].contacts) {
                                $("#match_contact_list").empty();
                                $("#match_contact_list").append(
                                    construct_contact(
                                        contact.type,
                                        contact.contact,
                                        false
                                    )
                                );
                            }
                            $("#contact_modal").modal("open");
                        });

                        $(".unmatch_button").click(function () {
                            let index = $(this).attr("data-index");
                            // console.log(matches[index]);
                            $.ajax({
                                url: url + "unmatch",
                                type: "POST",
                                contentType: "application/json",
                                // dataType: "json",
                                data: {
                                    id: sessionStorage.getItem("user"),
                                    match_id: matches[index].id,
                                },
                                // error: function (response) {
                                //     console.log(response);
                                //     //TODO
                                //     // $("#modal_message").text("Account doesn't exist!");
                                //     // $("#popup").modal("open");
                                // },
                                success: function (data) {
                                    location.reload();
                                },
                            });
                        });
                    },
                });

                //check new matches
                if (user_info.inform) {
                    $.ajax({
                        url: url + "informed",
                        type: "POST",
                        contentType: "application/json",
                        // dataType: "json",
                        data: {
                            id: sessionStorage.getItem("user"),
                        },
                    });
                    // db.collection("users")
                    //     .doc(sessionStorage.getItem("user"))
                    //     .update({
                    //         inform: firebase.firestore.FieldValue.delete(),
                    //     });
                    alert("You have a new match!");
                }
            },
        });
        // db.collection("users")
        //     .doc(sessionStorage.getItem("user"))
        //     .get()
        //     .then((doc) => {
        //         user_info = doc.data();

        //     });
    }
});

//add match's id to user's matches
$("#match_button").click(function () {
    $.ajax({
        url: url + "match",
        type: "POST",
        contentType: "application/json",
        data: {
            id: sessionStorage.getItem("user"),
            match_id: match_info.id,
        },
        success: function (data) {
            if (data.inform) {
                sessionStorage.setItem("tab", "matches");
                alert("Its a match!");
            }
            location.reload();
        },
    });
});

//add match's id to user's passes
$("#pass_button").click(function () {
    $.ajax({
        url: url + "pass",
        type: "POST",
        contentType: "application/json",
        data: {
            id: sessionStorage.getItem("user"),
            match_id: match_info.id,
        },
        success: function (data) {
            location.reload();
        },
    });
});

$(".tab").click(function () {
    sessionStorage.setItem("tab", $(this).find("a").attr("href").substring(1));
});

$("#logout").click(function () {
    sessionStorage.removeItem("user");
    location.reload();
});

$("#login_form").submit(function () {
    $.ajax({
        url: url + "login",
        type: "POST",
        contentType: "application/json",
        // dataType: "json",
        data: {
            email: $("#login_email").val(),
            password: $("#login_password").val(),
        },
        error: function (response) {
            $("#modal_message").text("Account doesn't exist!");
            $("#popup").modal("open");
        },
        success: function (data) {
            // console.log(data);
            sessionStorage.setItem("user", data.id);
            sessionStorage.setItem("tab", "account");
            alert("Login successful!");
            location.reload();
        },
    });
    return false; //prevent the page from reloading
});

function update_account(action) {
    // console.log(ref);
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
    $.ajax({
        url: url + "update",
        type: "POST",
        contentType: "application/json",
        data: {
            id: sessionStorage.getItem("user"),
            name: $("#name").val(),
            email: $("#profile_email").val(),
            password: $("#profile_password").val(),
            contacts: contacts,
            technologies: technologies,
            age: parseInt($("#age").val()),
            description: $("#profile_description").val(),
            keywords: keywords,
        },
        success: function (data) {
            action();
            location.reload();
        },
    });
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
        $.ajax({
            url: url + "can-register",
            type: "POST",
            contentType: "application/json",
            data: {
                email: $("#profile_email").val(),
            },
            error: function (data) {
                $("#modal_message").text("Account already exists!");
                $("#popup").modal("open");
            },
            success: function (data) {
                sessionStorage.setItem("user", data);
                update_account(function () {
                    sessionStorage.setItem("tab", "account");
                    alert("Registration successful!");
                });
            },
        });
    } else {
        //update account information
        update_account(function () {
            console.log("updated");
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

//TODO if you logout, the account details will remain in the register section
//TODO show all profile details in matches tab as well
//TODO ability to add pictures (multiple if possible)
