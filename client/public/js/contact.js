const issueelement = document.getElementById("issueelement");

function issueheard(messege) {
    issueelement.classList.remove("displaynone");
    document.getElementById('issueelementp').innerHTML = messege;
    messege = null;
}

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('Success')) {
    const Success = urlParams.get('Success');
    if (Success === 'true') {
        issueheard("We will reach to you soon via Email");
    } else if(Success === 'false') {
        issueheard("Something Went Wrong, Your Response isn't recorded, Please Reach to our Email");
    }
}