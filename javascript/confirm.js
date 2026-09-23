// function showConfirm(title, message) {
  
//   return new Promise((resolve) => {

//     const modal = document.getElementById("confirmModal");
//     const titleEl = document.getElementById("confirmTitle");
//     const messageEl = document.getElementById("confirmMessage");
//     const confirmBtn = document.getElementById("confirmYes");
//     const cancelBtn = document.getElementById("confirmNo");

//     if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
//       console.error("Confirm modal elements missing in DOM");
//       resolve(false);
//       return;
//     }

//     titleEl.textContent = title;
//     messageEl.textContent = message;

//     modal.classList.add("active");

//     confirmBtn.onclick = null;
//     cancelBtn.onclick = null;

//     confirmBtn.onclick = () => {
//       modal.classList.remove("active");
//       resolve(true);
//     };

//     cancelBtn.onclick = () => {
//       modal.classList.remove("active");
//       resolve(false);
//     };

//   });
// }

// window.showConfirm = showConfirm;


function showConfirm(title, message) {

  console.log("showConfirm() called");

  return new Promise((resolve) => {

    const modal = document.getElementById("confirmModal");
    const confirmBtn = document.getElementById("confirmYes");
    const cancelBtn = document.getElementById("confirmNo");

    modal.classList.add("active");

    confirmBtn.onclick = () => {
      console.log("Confirm clicked");
      modal.classList.remove("active");
      resolve(true);
    };

    cancelBtn.onclick = () => {
      console.log("Cancel clicked");
      modal.classList.remove("active");
      resolve(false);
    };

  });
}