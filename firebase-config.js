// Firebase 설정
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

  apiKey: "AIzaSyBiTeEbdhUbnOn75x9dBNIwV3Nv04tnheg",
  authDomain: "sapa-2nd-classmaker.firebaseapp.com",
  databaseURL: "https://sapa-2nd-classmaker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sapa-2nd-classmaker",
  storageBucket: "sapa-2nd-classmaker.firebasestorage.app",
  messagingSenderId: "71190830822",
  appId: "1:71190830822:web:27092bf3762d61c1e9e527",
  measurementId: "G-EED22SG0P3"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 현재 학년 가져오기 (URL 파라미터에서)
function getCurrentGrade() {
  const params = new URLSearchParams(window.location.search);
  return params.get('grade') || '1';
}

// 데이터 저장
export async function saveToFirebase(dataType, data) {
  const grade = getCurrentGrade();
  const dataRef = ref(database, `grades/grade${grade}/${dataType}`);

  try {
    await set(dataRef, data);
    console.log(`${dataType} 저장 완료`);
    return true;
  } catch (error) {
    console.error(`${dataType} 저장 실패:`, error);
    return false;
  }
}

// 데이터 불러오기
export async function loadFromFirebase(dataType) {
  const grade = getCurrentGrade();
  const dataRef = ref(database, `grades/grade${grade}/${dataType}`);

  try {
    const snapshot = await get(dataRef);
    if (snapshot.exists()) {
      console.log(`${dataType} 불러오기 완료`);
      return snapshot.val();
    } else {
      console.log(`${dataType} 데이터 없음`);
      return null;
    }
  } catch (error) {
    console.error(`${dataType} 불러오기 실패:`, error);
    return null;
  }
}

// 실시간 데이터 감시 (다른 탭/사용자와 동기화)
export function watchFirebase(dataType, callback) {
  const grade = getCurrentGrade();
  const dataRef = ref(database, `grades/grade${grade}/${dataType}`);

  onValue(dataRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    }
  });
}

export { database, ref, set, get };
