// ========================================
// 비밀번호 설정 (여기서 수정하세요!)
// ========================================
const PASSWORDS = {
  grade1: "1234",  // 1학년 비밀번호
  grade2: "1234"   // 2학년 비밀번호
};
// ========================================

let selectedGrade = null;

function showPasswordModal(grade) {
  selectedGrade = grade;
  const modal = document.getElementById("password-modal");
  const modalTitle = document.getElementById("modal-title");
  const passwordInput = document.getElementById("password-input");
  const errorMessage = document.getElementById("error-message");

  modalTitle.textContent = `${grade}학년 접근`;
  passwordInput.value = "";
  errorMessage.textContent = "";

  modal.classList.add("show");
  passwordInput.focus();
}

function closeModal() {
  const modal = document.getElementById("password-modal");
  modal.classList.remove("show");
  selectedGrade = null;
}

function checkPassword() {
  const passwordInput = document.getElementById("password-input");
  const errorMessage = document.getElementById("error-message");
  const enteredPassword = passwordInput.value;

  const correctPassword = selectedGrade === 1 ? PASSWORDS.grade1 : PASSWORDS.grade2;

  if (enteredPassword === correctPassword) {
    // 비밀번호 맞음 - 해당 학년 페이지로 이동
    window.location.href = `grade.html?grade=${selectedGrade}`;
  } else {
    // 비밀번호 틀림
    errorMessage.textContent = "비밀번호가 틀렸습니다.";
    passwordInput.value = "";
    passwordInput.focus();

    // 3초 후 에러 메시지 제거
    setTimeout(() => {
      errorMessage.textContent = "";
    }, 3000);
  }
}

// Enter 키로 확인
document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("password-input");
  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      checkPassword();
    }
  });

  // ESC 키로 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });
});
