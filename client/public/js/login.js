const issueelement = document.getElementById("issueelement");

function issueheard(messege) {
    issueelement.classList.remove("displaynone");
    document.getElementById('issueelementp').innerHTML = messege;
    messege = null;
}
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('error')) {
    const errorMessage = urlParams.get('error');
    if (errorMessage === 'WrongloginPassword') {
        issueheard("Wrong password. Please try again.");
    }else if(errorMessage === 'SignEmailused'){
        issueheard("Your Email is already Registered!");
    }else if(errorMessage === 'SuccessSignup'){
        issueheard("You are Successfully Registered!");
    }
}
