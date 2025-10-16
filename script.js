// Contact form alert
function submitForm(e) {
  e.preventDefault();
  alert("Thank you! Your message has been sent.");
  e.target.reset();
}

// Elements
const roleSelect = document.getElementById("role");
const studentField = document.querySelector(".student-field");
const teacherField = document.querySelector(".teacher-field");
const passwordField = document.querySelector(".password-field");

// Handle role change
roleSelect.addEventListener("change", () => {
  if (roleSelect.value === "student") {
    studentField.style.display = "block";
    teacherField.style.display = "none";
    passwordField.style.display = "block";

    document.getElementById("regno").required = true;
    document.getElementById("email").required = true; // Parent email required for student
    document.getElementById("password").required = true;
  } else if (roleSelect.value === "teacher") {
    studentField.style.display = "none";
    teacherField.style.display = "block";
    passwordField.style.display = "block";

    document.getElementById("regno").required = false;
    document.getElementById("email").required = true; // Teacher email required
    document.getElementById("password").required = true;
  } else {
    studentField.style.display = "none";
    teacherField.style.display = "none";
    passwordField.style.display = "none";

    document.getElementById("regno").required = false;
    document.getElementById("email").required = false;
    document.getElementById("password").required = false;
  }
});

// Handle form submission
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const role = roleSelect.value;
  const regno = document.getElementById("regno").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

if (role === "student") {
  if (!regno || !email) return alert("Please enter your Reg No and Parent Email");
  alert(`Welcome Student\nReg No: ${regno}\nParent Email: ${email}`);
  window.location.href = "student-dashboard.html";
} else if (role === "teacher") {
  if (!email || !password) return alert("Please enter your Email and Password");
  alert(`Welcome Teacher\nEmail: ${email}`);
  window.location.href = "teacher-dashboard.html";
}
});
