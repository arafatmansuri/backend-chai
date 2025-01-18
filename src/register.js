const form = document.querySelector("form");
const p = document.createElement("p");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  let formData = new FormData(form);
  const response = await axios
    .post("http://127.0.0.1:8000/api/v1/users/register/", formData)
    .catch(function (error) {
      if (error.response) {
        // console.log(error.response.data.message.message);
        p.textContent = error.response.data.message.message;
        document.body.appendChild(p);
      } else if (error.request) {
        // console.log(error.request);
      } else {
        console.log("Error", error.message);
      }
      console.log(error.config);
    });
  console.log(response);
  // We can redirect to the login/home page if user registers successfully.
  /*if (response.data.success) {
    location.href = location.origin + "/src/login.html";
  }*/
  p.textContent = response.data.message;
  document.body.appendChild(p);
});
