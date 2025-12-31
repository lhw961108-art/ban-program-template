const fileInput = document.getElementById("file-input");
const classContainer = document.getElementById("class-container");
const historyList = document.getElementById("history-list");
const modal = document.getElementById("confirm-modal");
const modalMessage = document.getElementById("modal-message");
const modalConfirm = document.getElementById("modal-confirm");
const modalCancel = document.getElementById("modal-cancel");
const prevClassFilter = document.getElementById("prev-class-filter");
const downloadHistoryBtn = document.getElementById("download-history");

fileInput.addEventListener("change", handleFile);
downloadHistoryBtn.addEventListener("click", downloadHistory);

// 전역 데이터 저장
let globalClassMap = {};
let changeHistory = [];
let draggedStudent = null;
let draggedClassKey = null;
let selectedPrevClasses = new Set();
let markedStudents = new Set(); // 요주의 학생 (이름으로 저장)

async function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  // 첫 번째 시트만 사용 (원데이터가 여기 있다고 가정)
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  // 행렬 형태로 그대로 읽기
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!aoa || aoa.length === 0) return;

  // 1. 헤더 행 찾기: "성명" 또는 "이름" 이 들어있는 행
  let headerRowIndex = -1;
  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const hasNameHeader = row.some(cell => {
      const v = String(cell).trim();
      return v === "성명" || v === "이름";
    });
    if (hasNameHeader) {
      headerRowIndex = r;
      break;
    }
  }
  if (headerRowIndex === -1) {
    alert("시트에서 '성명' 또는 '이름' 헤더를 찾을 수 없습니다.");
    return;
  }

  // 2. 해당 헤더 행에서 각 컬럼 위치 찾기
  const headerRow = aoa[headerRowIndex];
  console.log("전체 헤더 (현재 행):", headerRow);

  // 다음 행도 확인 (병합된 셀 구조일 수 있음)
  if (headerRowIndex + 1 < aoa.length) {
    console.log("다음 행 (서브헤더?):", aoa[headerRowIndex + 1]);
  }

  const colMap = {
    grade: headerRow.findIndex(v => String(v).trim() === "학년"),
    class: headerRow.findIndex(v => String(v).trim() === "반"),
    num: headerRow.findIndex(v => String(v).trim() === "번호"),
    name: headerRow.findIndex(v => {
      const t = String(v).trim();
      return t === "성명" || t === "이름";
    }),
    gender: headerRow.findIndex(v => String(v).trim() === "성별"),
    score: headerRow.findIndex(v => {
      const t = String(v).trim();
      return t === "기준성적" || t === "기준점수" || t === "배정점수" || t === "점수";
    }),
    prevClass: -1  // 이전 학적 반
  };

  // 이전 학적 섹션 찾기
  for (let i = 0; i < headerRow.length; i++) {
    const cellValue = String(headerRow[i]).trim();
    // "이전학적" (띄어쓰기 없음) 또는 "이전 학적" 찾기
    if (cellValue === "이전학적" || cellValue === "이전 학적") {
      console.log("'이전학적' 컬럼 발견, 인덱스:", i);

      // 병합된 셀 구조: 다음 행(서브헤더)에서 "반" 찾기
      if (headerRowIndex + 1 < aoa.length) {
        const subHeaderRow = aoa[headerRowIndex + 1];
        for (let j = i; j < headerRow.length && j < i + 10; j++) {
          const subHeader = String(subHeaderRow[j]).trim();
          console.log(`  서브헤더 검사 [${j}]:`, subHeader);
          if (subHeader === "반") {
            colMap.prevClass = j;
            console.log("  이전 학적의 '반' 컬럼 발견, 인덱스:", j);
            break;
          }
        }
      }
      break;
    }
  }
  console.log("이전 반 컬럼 인덱스:", colMap.prevClass);

  if (colMap.class === -1 || colMap.name === -1) {
    alert("반 또는 성명 컬럼을 찾지 못했습니다.");
    return;
  }

  // 3. 데이터 행 파싱
  const classMap = {}; // { "3-1": { grade, class, students:[{no, name, gender, noSort}] } }

  for (let r = headerRowIndex + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;

    const name = String(row[colMap.name]).trim();
    const cls = String(row[colMap.class]).trim();

    // 이름/반이 없거나, 반이 숫자가 아니면 (헤더/이상치) 건너뛰기
    if (!name || !cls || isNaN(parseInt(cls, 10))) continue;

    const grade = colMap.grade !== -1 ? String(row[colMap.grade]).trim() : "";
    let num = colMap.num !== -1 ? String(row[colMap.num]).trim() : "";
    let gender = colMap.gender !== -1 ? String(row[colMap.gender]).trim() : "";
    let score = colMap.score !== -1 ? String(row[colMap.score]).trim() : "";
    let prevClass = colMap.prevClass !== -1 ? String(row[colMap.prevClass]).trim() : "";

    const numSort = parseInt(num, 10);
    const noSort = isNaN(numSort) ? 9999 : numSort;

    // key: "3-1" 처럼 학년-반
    const key =
      (grade ? grade.replace("학년", "").trim() + "-" : "") + cls;

    if (!classMap[key]) {
      classMap[key] = {
        grade,
        class: cls,
        students: []
      };
    }

    classMap[key].students.push({
      no: num,
      name,
      gender,
      score,
      prevClass,
      noSort
    });
  }

  // 4. 반별 번호 순 정렬
  Object.values(classMap).forEach(info => {
    info.students.sort((a, b) => a.noSort - b.noSort);
  });

  globalClassMap = classMap;

  // 이전 반 체크박스 생성
  renderPrevClassFilter();

  renderClasses(classMap);
}

// 이전 반 필터 체크박스 생성
function renderPrevClassFilter() {
  prevClassFilter.innerHTML = "";

  // 모든 학생의 이전 반 정보 수집
  const prevClasses = new Set();
  Object.values(globalClassMap).forEach(classInfo => {
    classInfo.students.forEach(student => {
      if (student.prevClass && student.prevClass !== "") {
        prevClasses.add(student.prevClass);
      }
    });
  });

  console.log("이전 반 정보:", Array.from(prevClasses));

  // 이전 반이 없으면 표시하지 않음
  if (prevClasses.size === 0) {
    console.log("이전 반 데이터가 없습니다.");
    return;
  }

  // 이전 반 번호 순으로 정렬
  const sortedPrevClasses = Array.from(prevClasses).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b, "ko");
  });

  // 제목 추가
  const title = document.createElement("span");
  title.textContent = "이전 반:";
  title.style.fontWeight = "600";
  prevClassFilter.appendChild(title);

  // 체크박스 생성
  sortedPrevClasses.forEach(prevClass => {
    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = prevClass;
    checkbox.addEventListener("change", handlePrevClassFilter);

    const text = document.createElement("span");
    text.textContent = `${prevClass}반`;

    label.appendChild(checkbox);
    label.appendChild(text);
    prevClassFilter.appendChild(label);
  });
}

// 이전 반 필터 체크박스 변경 처리
function handlePrevClassFilter(e) {
  const prevClass = e.target.value;

  if (e.target.checked) {
    selectedPrevClasses.add(prevClass);
  } else {
    selectedPrevClasses.delete(prevClass);
  }

  // 하이라이트 업데이트
  updateHighlights();
}

// 하이라이트 업데이트
function updateHighlights() {
  const allStudentItems = document.querySelectorAll(".student-list li");

  allStudentItems.forEach(li => {
    const classKey = li.dataset.classKey;
    const studentIndex = parseInt(li.dataset.studentIndex);
    const student = globalClassMap[classKey].students[studentIndex];

    if (selectedPrevClasses.size > 0 && selectedPrevClasses.has(student.prevClass)) {
      li.classList.add("highlighted");
    } else {
      li.classList.remove("highlighted");
    }
  });
}

function renderClasses(classMap) {
  classContainer.innerHTML = "";

  const keys = Object.keys(classMap).sort((a, b) => {
    // "3-1", "3-2" 같은 형식을 학년-반 기준으로 정렬
    const [ga, ca] = a.split("-").map(Number);
    const [gb, cb] = b.split("-").map(Number);
    if (!isNaN(ga) && !isNaN(gb)) {
      if (ga === gb) return ca - cb;
      return ga - gb;
    }
    return a.localeCompare(b, "ko");
  });

  keys.forEach(key => {
    const info = classMap[key];
    const col = document.createElement("div");
    col.className = "class-column";

    // 헤더
    const header = document.createElement("div");
    header.className = "class-header";

    const title = document.createElement("div");
    const gradeText = info.grade ? info.grade + " " : "";
    title.textContent = `${gradeText}${info.class}반`;

    // 남녀 인원 계산
    const maleCount = info.students.filter(s => s.gender.trim() === "남").length;
    const femaleCount = info.students.filter(s => s.gender.trim() === "여").length;

    const count = document.createElement("div");
    count.className = "class-count";
    count.textContent = `${info.students.length}명 (남${maleCount} / 여${femaleCount})`;

    header.appendChild(title);
    header.appendChild(count);

    // 학생 리스트
    const ul = document.createElement("ul");
    ul.className = "student-list";

    info.students.forEach((s, index) => {
      const li = document.createElement("li");
      const noText = s.no ? `${s.no}번 ` : "";
      const scoreText = s.score ? ` (${s.score})` : "";
      li.textContent = `${noText}${s.name}${scoreText}`;

      // 🔹 성별에 따라 색상 클래스 부여
      const g = s.gender.trim();
      if (g === "남") {
        li.classList.add("male");
      } else if (g === "여") {
        li.classList.add("female");
      }

      // 요주의 학생 표시
      if (markedStudents.has(s.name)) {
        li.classList.add("marked");
      }

      // 드래그 앤 드롭 이벤트
      li.draggable = true;
      li.dataset.classKey = key;
      li.dataset.studentIndex = index;

      li.addEventListener("dragstart", handleDragStart);
      li.addEventListener("dragend", handleDragEnd);
      li.addEventListener("dragover", handleDragOver);
      li.addEventListener("drop", handleDrop);
      li.addEventListener("dragleave", handleDragLeave);

      // 더블클릭으로 요주의 표시 토글
      li.addEventListener("dblclick", (e) => {
        e.preventDefault();
        toggleMarkedStudent(s.name);
      });

      ul.appendChild(li);
    });

    col.appendChild(header);
    col.appendChild(ul);
    classContainer.appendChild(col);
  });
}

// 드래그 시작
function handleDragStart(e) {
  const classKey = e.target.dataset.classKey;
  const studentIndex = parseInt(e.target.dataset.studentIndex);

  draggedStudent = globalClassMap[classKey].students[studentIndex];
  draggedClassKey = classKey;

  e.target.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}

// 드래그 끝
function handleDragEnd(e) {
  e.target.classList.remove("dragging");

  // 모든 drag-over 클래스 제거
  document.querySelectorAll(".drag-over").forEach(el => {
    el.classList.remove("drag-over");
  });
}

// 드래그 오버
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";

  const target = e.target.closest("li");
  if (target && !target.classList.contains("dragging")) {
    target.classList.add("drag-over");
  }
}

// 드래그 떠남
function handleDragLeave(e) {
  const target = e.target.closest("li");
  if (target) {
    target.classList.remove("drag-over");
  }
}

// 드롭
function handleDrop(e) {
  e.preventDefault();

  const target = e.target.closest("li");
  if (!target) return;

  target.classList.remove("drag-over");

  const targetClassKey = target.dataset.classKey;
  const targetStudentIndex = parseInt(target.dataset.studentIndex);
  const targetStudent = globalClassMap[targetClassKey].students[targetStudentIndex];

  // 같은 학생에게 드롭한 경우 무시
  if (draggedClassKey === targetClassKey &&
      draggedStudent === targetStudent) {
    return;
  }

  // 모달 표시
  showSwapModal(draggedStudent, draggedClassKey, targetStudent, targetClassKey);
}

// 교환 확인 모달 표시
function showSwapModal(student1, classKey1, student2, classKey2) {
  const class1Info = globalClassMap[classKey1];
  const class2Info = globalClassMap[classKey2];

  const class1Text = class1Info.grade ? `${class1Info.grade} ${class1Info.class}반` : `${class1Info.class}반`;
  const class2Text = class2Info.grade ? `${class2Info.grade} ${class2Info.class}반` : `${class2Info.class}반`;

  const student1Text = `${class1Text} ${student1.no}번 ${student1.name}`;
  const student2Text = `${class2Text} ${student2.no}번 ${student2.name}`;

  modalMessage.innerHTML = `<strong>${student1Text}</strong>과(와)<br><strong>${student2Text}</strong>을(를)<br>교환하시겠습니까?`;

  modal.classList.add("show");

  // 한 번만 실행되는 이벤트 리스너
  const handleConfirm = () => {
    swapStudents(student1, classKey1, student2, classKey2);
    modal.classList.remove("show");
    modalConfirm.removeEventListener("click", handleConfirm);
    modalCancel.removeEventListener("click", handleCancel);
  };

  const handleCancel = () => {
    modal.classList.remove("show");
    modalConfirm.removeEventListener("click", handleConfirm);
    modalCancel.removeEventListener("click", handleCancel);
  };

  modalConfirm.addEventListener("click", handleConfirm);
  modalCancel.addEventListener("click", handleCancel);
}

// 학생 교환 실행
function swapStudents(student1, classKey1, student2, classKey2) {
  const class1 = globalClassMap[classKey1];
  const class2 = globalClassMap[classKey2];

  const index1 = class1.students.indexOf(student1);
  const index2 = class2.students.indexOf(student2);

  // 교환
  [class1.students[index1], class2.students[index2]] = [class2.students[index2], class1.students[index1]];

  // 히스토리 기록
  addHistory(student1, classKey1, student2, classKey2);

  // 화면 갱신
  renderClasses(globalClassMap);

  // 하이라이트 재적용
  updateHighlights();
}

// 히스토리 추가
function addHistory(student1, classKey1, student2, classKey2) {
  const now = new Date();
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  const class1Info = globalClassMap[classKey1];
  const class2Info = globalClassMap[classKey2];

  const class1Text = class1Info.grade ? `${class1Info.grade} ${class1Info.class}반` : `${class1Info.class}반`;
  const class2Text = class2Info.grade ? `${class2Info.grade} ${class2Info.class}반` : `${class2Info.class}반`;

  const historyItem = {
    time: timeString,
    student1: { name: student1.name, no: student1.no, class: class1Text },
    student2: { name: student2.name, no: student2.no, class: class2Text },
    // 되돌리기를 위한 원본 데이터 저장
    originalData: {
      student1: student1,
      classKey1: classKey1,
      student2: student2,
      classKey2: classKey2
    },
    undone: false
  };

  changeHistory.unshift(historyItem);
  renderHistory();
}

// 히스토리 렌더링
function renderHistory() {
  historyList.innerHTML = "";

  changeHistory.forEach((item, index) => {
    const li = document.createElement("li");
    if (item.undone) {
      li.classList.add("undone");
    }

    const content = document.createElement("div");
    content.className = "history-content";
    content.innerHTML = `
      <div class="history-time">${item.time}${item.undone ? ' (되돌림)' : ''}</div>
      <div>${item.student1.class} ${item.student1.no}번 ${item.student1.name} ↔</div>
      <div>${item.student2.class} ${item.student2.no}번 ${item.student2.name}</div>
    `;

    li.appendChild(content);

    if (!item.undone) {
      const undoButton = document.createElement("button");
      undoButton.textContent = "되돌리기";
      undoButton.className = "history-undo";
      undoButton.addEventListener("click", () => undoSwap(index));
      li.appendChild(undoButton);
    }

    historyList.appendChild(li);
  });
}

// 교환 되돌리기
function undoSwap(historyIndex) {
  const item = changeHistory[historyIndex];
  if (item.undone) return;

  const { student1, classKey1, student2, classKey2 } = item.originalData;

  // 현재 두 학생이 어디 있는지 찾기
  const class1 = globalClassMap[classKey1];
  const class2 = globalClassMap[classKey2];

  // 원래 교환된 학생들을 다시 찾아서 교환
  const currentIndex1 = class1.students.findIndex(s => s.name === student2.name && s.no === student2.no);
  const currentIndex2 = class2.students.findIndex(s => s.name === student1.name && s.no === student1.no);

  if (currentIndex1 !== -1 && currentIndex2 !== -1) {
    // 다시 교환 (원래대로 되돌림)
    [class1.students[currentIndex1], class2.students[currentIndex2]] =
    [class2.students[currentIndex2], class1.students[currentIndex1]];

    // 히스토리 항목을 되돌림으로 표시
    item.undone = true;

    // 화면 갱신
    renderClasses(globalClassMap);
    renderHistory();

    // 하이라이트 재적용
    updateHighlights();
  } else {
    alert("되돌리기 실패: 학생 위치를 찾을 수 없습니다. 이미 다른 교환이 발생했을 수 있습니다.");
  }
}

// 요주의 학생 토글
function toggleMarkedStudent(studentName) {
  if (markedStudents.has(studentName)) {
    markedStudents.delete(studentName);
  } else {
    markedStudents.add(studentName);
  }

  // 화면 갱신
  renderClasses(globalClassMap);

  // 하이라이트 재적용
  updateHighlights();
}

// 히스토리 다운로드
function downloadHistory() {
  if (changeHistory.length === 0) {
    alert("다운로드할 히스토리가 없습니다.");
    return;
  }

  // 엑셀 데이터 생성 (역순으로 - 가장 먼저 변경된 것이 1번)
  const excelData = [];

  // 헤더 추가
  excelData.push(["연번", "시간", "학생1 반", "학생1 번호", "학생1 이름", "학생2 반", "학생2 번호", "학생2 이름", "상태"]);

  // 데이터 추가 (역순으로)
  const reversedHistory = [...changeHistory].reverse();
  reversedHistory.forEach((item, index) => {
    excelData.push([
      index + 1,
      item.time,
      item.student1.class,
      item.student1.no,
      item.student1.name,
      item.student2.class,
      item.student2.no,
      item.student2.name,
      item.undone ? "되돌림" : "변경"
    ]);
  });

  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 6 },  // 연번
    { wch: 10 }, // 시간
    { wch: 10 }, // 학생1 반
    { wch: 8 },  // 학생1 번호
    { wch: 10 }, // 학생1 이름
    { wch: 10 }, // 학생2 반
    { wch: 8 },  // 학생2 번호
    { wch: 10 }, // 학생2 이름
    { wch: 8 }   // 상태
  ];

  // 워크북 생성
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "변경히스토리");

  // 파일명 생성 (현재 날짜와 시간)
  const now = new Date();
  const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  const fileName = `반편성_변경히스토리_${dateStr}_${timeStr}.xlsx`;

  // 다운로드
  XLSX.writeFile(wb, fileName);
}
