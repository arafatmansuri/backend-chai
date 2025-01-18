const form = document.querySelector("form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  let formData = new FormData(form);
  /* Iterating form data:
  formData.forEach((value, index) => {
    console.log(index, value);
  }); */

  const p = document.createElement("p");
  // try {
  /* Way - 1 of sending axios
    const response = await axios({
      method: "POST",
      url: "http://127.0.0.1:8000/api/v1/users/register/",
      data: formData,
    });*/
  const response = await axios.post(
    "http://127.0.0.1:8000/api/v1/users/register/",
    formData
  );
  console.log(response);
  // if (response.data.success) {
  //   location.href = location.origin + "/src/login.html";
  // } else
  if (!response.data.success) {
    console.log(response.response.data);
  }
  // console.log(response.data.message);
  p.textContent = response.data.message;
  document.body.appendChild(p);
  // } catch (err) {
  //   p.textContent = err;
  //   document.body.appendChild(p);
  // }
});
