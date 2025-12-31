# 반편성 조정 프로그램

학교 반편성을 조정할 수 있는 웹 프로그램입니다. 드래그 앤 드롭으로 학생을 교환하거나 이동할 수 있습니다.

## 주요 기능

- 엑셀 파일(.xlsx)에서 학생 데이터 불러오기
- 드래그 앤 드롭으로 학생 교환 (학생 → 학생)
- 드래그 앤 드롭으로 학생 이동 (학생 → 반 컬럼)
- 변경 히스토리 기록 및 되돌리기
- 이전 반 필터링 (같은 반 출신 하이라이트)
- 요주의 학생 표시 (더블클릭)
- 실시간 동기화 (Firebase)

## 설치 방법

### 1. 저장소 Fork

이 저장소를 Fork하여 본인의 GitHub 계정으로 복사합니다.

### 2. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com)에 접속
2. **프로젝트 추가** 클릭
3. 프로젝트 이름 입력 후 생성

### 3. Realtime Database 활성화

1. Firebase Console에서 **빌드** → **Realtime Database** 클릭
2. **데이터베이스 만들기** 클릭
3. 위치 선택 (asia-southeast1 권장)
4. **테스트 모드에서 시작** 선택 후 **사용 설정**

### 4. Database 보안 규칙 설정

Realtime Database → **규칙** 탭에서 다음과 같이 설정:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ 위 규칙은 테스트용입니다. 실제 운영 시에는 보안 규칙을 강화하세요.

### 5. Firebase 설정 정보 가져오기

1. Firebase Console → **프로젝트 설정** (톱니바퀴 아이콘)
2. **일반** 탭 하단의 **내 앱** 섹션
3. **웹 앱 추가** (</> 아이콘) 클릭
4. 앱 닉네임 입력 후 **앱 등록**
5. `firebaseConfig` 객체의 값들을 복사

### 6. 코드에 Firebase 설정 입력

다음 파일들에서 Firebase 설정을 본인 것으로 교체:

**`grade.html`** (18~28라인):
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**`firebase-config.js`** (7~15라인)도 동일하게 수정

### 7. 배포

#### Netlify 배포 (추천)
1. [Netlify](https://netlify.com) 가입
2. **Add new site** → **Import an existing project**
3. GitHub 연결 후 Fork한 저장소 선택
4. **Deploy site** 클릭

#### GitHub Pages 배포
1. 저장소 **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **/ (root)** 선택
4. **Save** 클릭

## 사용 방법

1. 프로그램 접속
2. **찾아보기** 버튼으로 엑셀 파일 업로드
3. 학생 카드를 드래그하여:
   - 다른 학생 위에 드롭 → **교환**
   - 다른 반 컬럼(빈 공간)에 드롭 → **이동**
4. 히스토리에서 **되돌리기** 가능
5. 학생 더블클릭으로 요주의 표시

## 엑셀 파일 형식

다음 컬럼이 포함되어야 합니다:

| 필수 컬럼 | 설명 |
|----------|------|
| 반 | 현재 반 (숫자) |
| 성명 또는 이름 | 학생 이름 |

| 선택 컬럼 | 설명 |
|----------|------|
| 학년 | 학년 정보 |
| 번호 | 출석번호 |
| 성별 | 남/여 |
| 기준성적 | 점수 표시용 |
| 이전학적 > 반 | 이전 반 정보 |

## 라이선스

MIT License
