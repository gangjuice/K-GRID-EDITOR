# K-GRID EDITOR

네이버 지도 위에 토지이용계획 도면(.geojson)을 올리고, 필지별 수요전력·공급률·변전소/배전선로 정보를 입력하고 관리하는 Windows 데스크톱 앱입니다.

앱을 켜면 내부에서 로컬 서버(`http://localhost:8000`)가 뜨고, 그 위에서 화면과 네이버 지도 API를 불러옵니다. 네이버 지도는 `file://` 경로에서는 인증이 막히기 때문에, 로컬 서버를 거쳐 `http://localhost` 로 띄우는 구조입니다.

## 실행 파일(EXE) 만들기

### 방법 1. 더블클릭으로 만들기 (가장 쉬움)

1. [Node.js LTS](https://nodejs.org) 를 먼저 설치합니다. (최초 1회만)
2. `build.bat` 파일을 더블클릭합니다.
3. 빌드가 끝나면 `dist` 폴더가 자동으로 열립니다.
4. 폴더 안의 `K-GRID-EDITOR-1.0.0-portable.exe` 가 실행 파일입니다.

> 만들어진 exe는 **설치가 필요 없는 portable 버전**입니다. 더블클릭만으로 바로 실행되고, 다른 Windows PC에 복사해서 그대로 쓸 수 있습니다.

### 방법 2. 명령어로 만들기

```bash
npm install
npm run build
```

`dist` 폴더에 portable exe가 생성됩니다.

### 방법 3. GitHub에서 자동으로 받기

`main` 브랜치에 push하면 GitHub Actions가 Windows에서 자동으로 빌드합니다.
저장소의 **Actions** 탭 → 가장 최근 실행 → **Artifacts** 에서 `K-GRID-EDITOR` 를 내려받으세요.

## 빌드 없이 바로 실행해 보기 (개발/테스트용)

```bash
npm install
npm start
```
