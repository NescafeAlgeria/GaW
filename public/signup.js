const popup = document.getElementById('popup');
function showPopup(message, isSuccess = false) {
    popup.textContent = message;
    popup.className = 'popup' + (isSuccess ? ' success' : '');
    popup.style.display = 'block';
    setTimeout(() => {
        popup.style.display = 'none';
    }, 3000);
}

document.getElementById('signupForm').addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const role = document.getElementById("role").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/api/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, email, role, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showPopup("Signup failed: " + (data.error || "Unknown error"));
            return;
        }

        if (data.token) {
            localStorage.setItem("token", data.token);
            window.location.href = "/";
        }
    } catch (err) {
        showPopup("Signup failed: " + (err.message || "Network error"));
    }
});
