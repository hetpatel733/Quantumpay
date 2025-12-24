const issueelement = document.getElementById("issueelement");

function issueheard(message, type = 'info') {
    if (issueelement) {
        issueelement.classList.remove("displaynone");
        const messageElement = document.getElementById('issueelementp');
        if (messageElement) {
            messageElement.innerHTML = message;
            // Add appropriate styling based on type
            messageElement.className = type === 'success' ? 'text-success' : type === 'error' ? 'text-error' : '';
        }
    }
}

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('Success')) {
    const Success = urlParams.get('Success');
    if (Success === 'true') {
        issueheard("We will reach to you soon via Email", "success");
    } else if(Success === 'false') {
        issueheard("Something Went Wrong, Your Response isn't recorded, Please Reach to our Email", "error");
    }
}