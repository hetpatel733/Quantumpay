function copyaddress() {
    var address = document.getElementById("address");
    address.select();
    address.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(address.value);
    alert("Copied!!");
}

document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const payid = urlParams.get("payid");

    if (!payid) {
        alert("Missing payid in URL.");
        return;
    }

    let paymentStatus = 'pending';
    let isPolling = false;
    let statusCheckInterval;
    let pageReloadInterval;

    async function checkPaymentStatus(payid) {
        // Don't check if payment is already completed or failed
        if (paymentStatus === 'completed' || paymentStatus === 'failed') {
            stopPolling();
            return;
        }

        try {
            console.log('🔍 Checking payment status for:', payid);
            const res = await fetch(`/api/payment/check-status?payid=${encodeURIComponent(payid)}`);
            const data = await res.json();

            if (data.success) {
                const { address, payid: returnedPayid, amount, type, status, network } = data;

                // Update status
                paymentStatus = status;

                // Update QR code with dynamic amount
                const srcurl = `https://api.qrserver.com/v1/create-qr-code/?data=${address}&amount=${amount}&size=150x150`;
                const imageElement = document.getElementById('qr');
                if (imageElement) {
                    imageElement.src = srcurl;
                }

                // Update UI fields
                const addressElement = document.getElementById('address');
                if (addressElement) {
                    addressElement.value = address;
                }
                
                const orderidElement = document.getElementById('orderid');
                if (orderidElement) {
                    orderidElement.innerText = returnedPayid;
                }
                
                const amntElement = document.getElementById('amnt');
                if (amntElement) {
                    amntElement.innerText = amount;
                }
                
                // Display crypto type with network if available
                const cryptoDisplay = network ? `${type} (${network})` : type;
                const typeElement = document.getElementById('type');
                if (typeElement) {
                    typeElement.innerText = cryptoDisplay;
                }

                // Add network information if element exists
                const networkElement = document.getElementById('network');
                if (networkElement && network) {
                    networkElement.innerText = network;
                }

                // Show/hide payment status boxes based on order and API status
                const payunsuccess = document.getElementById("unsuccess");
                const paysuccess = document.getElementById("success");
                
                console.log('📊 Payment status:', status);
                
                if (status == "completed") {
                    if (paysuccess) {
                        paysuccess.classList.remove("displaynone");
                    }
                    if (payunsuccess) {
                        payunsuccess.classList.add("displaynone");
                    }
                    stopPolling(); // Stop polling when completed
                } else if (status == "pending") {
                    if (paysuccess) {
                        paysuccess.classList.add("displaynone");
                    }
                    if (payunsuccess) {
                        payunsuccess.classList.remove("displaynone");
                    }
                } else {
                    if (payunsuccess) {
                        payunsuccess.innerText = "Payment Failed! You can Try again";
                    }
                    stopPolling(); // Stop polling when failed
                }

            } else {
                console.error("❌ Error:", data.message);
                
                // Handle specific error codes for deactivated/paused states
                if (data.errorCode === 'ORDER_DEACTIVATED') {
                    alert("This product/service has been deactivated and is no longer available for payment.");
                    stopPolling();
                } else if (data.errorCode === 'API_PAUSED') {
                    alert("Payment processing is currently paused by the merchant. Please contact support.");
                    stopPolling();
                } else if (data.errorCode === 'ORDER_CANCELLED') {
                    alert("This order has been cancelled and cannot be paid.");
                    stopPolling();
                } else {
                    alert(`Error: ${data.message}`);
                }
            }
        } catch (err) {
            console.error("⚠️ Network Error:", err);
            // Don't alert for network errors during polling
            if (!isPolling) {
                alert("Network error while checking payment status.");
            }
        }
    }

    function startPolling() {
        if (isPolling) return;
        
        console.log('🔄 Starting payment status polling');
        isPolling = true;
        
        // Check every 30 seconds instead of continuous checking
        statusCheckInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                checkPaymentStatus(payid);
            }
        }, 30000);
    }

    function stopPolling() {
        if (statusCheckInterval) {
            console.log('⏹️ Stopping payment status polling');
            clearInterval(statusCheckInterval);
            statusCheckInterval = null;
            isPolling = false;
        }
        
        if (pageReloadInterval) {
            clearInterval(pageReloadInterval);
            pageReloadInterval = null;
        }
    }

    // Handle page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            if (paymentStatus === 'pending' && !isPolling) {
                startPolling();
            }
        } else {
            stopPolling();
        }
    });

    // Initial status check
    checkPaymentStatus(payid);

    // Start polling only if payment is pending
    if (paymentStatus === 'pending') {
        startPolling();
    }

    // Set up page reload interval (reduced frequency)
    // Only reload if payment is still pending after 5 minutes
    pageReloadInterval = setInterval(() => {
        if (paymentStatus === 'pending' && document.visibilityState === 'visible') {
            console.log('🔄 Auto-refreshing page after 5 minutes');
            window.location.reload();
        }
    }, 5 * 60 * 1000); // 5 minutes instead of 1 minute

    // Cleanup on page unload
    window.addEventListener('beforeunload', stopPolling);
});

setInterval(() => {
    window.location.reload();
}, 60000); // 60,000 milliseconds = 1 minute
