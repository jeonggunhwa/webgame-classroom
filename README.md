# 웹게임교실

바이브코딩으로 첫 웹게임을 만드는 중학교 1학년 대상 45장 수업입니다. 45분 × 3차시, 휴식 10분 × 2회, 총 155분입니다.

## 사용 주소

- 수업: https://jeonggunhwa.github.io/webgame-classroom/
- 강사: https://jeonggunhwa.github.io/webgame-classroom/#admin
- 소스: https://github.com/jeonggunhwa/webgame-classroom
- Firebase 콘솔: https://console.firebase.google.com/project/web-game-classroom/overview

## 온라인 연결

Firebase Realtime Database(싱가포르), Google 강사 로그인, 학생 익명 인증을 사용합니다. 승인된 강사 계정만 수업 콘텐츠·진행·공개 정책·타이머를 변경할 수 있습니다. Google에 로그인했다는 이유만으로 강사 권한이 생기지 않습니다.

학생은 별도 Google 계정 없이 자동으로 익명 인증됩니다. 질문은 참여자에게 공유되고, 신청 정보·퀴즈 답안은 본인과 강사만 열람합니다. 후기는 기본 비공개이며 강사가 승인한 본문만 공개합니다. 승인된 후기 수정 시 다시 비공개로 전환됩니다. 익명 인증도 서버 식별자가 생기는 방식으로 완전한 익명성을 뜻하지 않습니다. 실명 대신 별명만 쓰고 개인정보를 올리지 마세요.

강사 따라가기 잠금은 다른 학생 세션에 실시간 반영됩니다. 잠금을 풀면 학생이 자유롭게 이동할 수 있고, 다시 잠그면 강사 위치로 돌아갑니다. PDF·자료 공개는 학습 UI 운영 정책이며 이미 받은 공개 콘텐츠의 복사 방지/DRM이 아닙니다.

무료 Spark 요금제를 사용하며 결제·유료 업그레이드는 설정하지 않았습니다. 요금제 한도에 도달하면 제한될 수 있습니다. 인증 및 데이터 동기화에는 인터넷이 필요합니다. 연결 실패 시 슬라이드·게임 열람은 가능하지만 기록은 저장되지 않습니다.

## 파일

- index.html: 온라인 시작 화면
- 웹게임교실.html: 온라인 단일 HTML(인증·SDK에는 인터넷 필요)
- 오프라인-웹게임교실.html: 기존 오프라인 버전, 실제 로그인/다른 기기 동기화 없음
- 별잡기.html: 독립 게임
- assets/content.js: 수업 본문과 슬라이드
- assets/cloud.js: 인증·서버 저장·구독 경계
- assets/config.js: 공개 Firebase 웹 구성값. 비밀번호·서비스 계정 키 아님
- database.rules.json: Firebase에 게시한 서버 보안 규칙의 소스

Firebase SDK 11.10.0 compat CDN에서 app → auth → database를 로드한 뒤 config → content → game-source → cloud → app 순으로 실행합니다. 빌드 단계가 필요 없는 정적 사이트이며 main 브랜치 변경은 GitHub Pages로 자동 배포됩니다.

## 운영 주의

브라우저 캐시나 localStorage 값으로 강사 권한을 부여하지 않습니다. 서버 보안 규칙이 권한을 검사합니다. 학생 명단·후기·질문이 들어 있는 운영 백업은 공개 저장소에 올리지 마세요. 수업 후 운영 기록을 백업·정리하고 개인정보 보관 기간을 정하세요. 강사는 공용 PC에서 반드시 강사 로그아웃을 하세요.

콘솔에서 보안 규칙을 바꾸면 database.rules.json도 같이 갱신해야 합니다. 소스 수정 후 단일 HTML 및 ZIP은 다시 생성해야 합니다. AI API·문자·메일·결제는 연결하지 않았습니다.

강의 화면과 설명을 참고해 독립 재구성한 자료이며 강사 원본 복제본은 아닙니다.
