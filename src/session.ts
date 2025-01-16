import Swal from 'sweetalert2';

let player: YT.Player;
let marked: number | undefined;
let lastMarked: HTMLDivElement | undefined;
let currentQuestion = 0;
let shouldProceedToNextQuestion = false;
let correctAmount = 0;
let hasEnded = false;

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

interface QuestionOption {
  prefix: string;
  text: string;
}

interface Question {
  title: string;
  description: string;
  options: QuestionOption[];
  correctAnswer: number;
  pauseAt: number;
  action: "video" | "question" | "end";
}

interface SessionInfo {
  questions: Question[];
  videoid: string;
}

let questions: Question[];
let sessionInfo: SessionInfo;
let timer: number | null;

function onPlayerStateChange(event: YT.OnStateChangeEvent) {
  if (event.data == YT.PlayerState.PLAYING) {
    if (currentQuestion >= questions.length) return;

    if (timer != null) return;
    timer = setInterval(() => {
      // gerencia se deve parar o video no meio para mostrar uma pergunta
      const duration = player.getCurrentTime();

      const pauseAt = questions[currentQuestion].pauseAt;
      let shouldPause = duration >= pauseAt;
      if (pauseAt == -1) {
        shouldPause = hasEnded;
      }

      if (shouldPause) {
        player.pauseVideo();
        createAlternatives();
        if (timer) {
          clearInterval(timer);
        }
        
        timer = null;
      }
    }, 500)
  } else if (event.data == YT.PlayerState.ENDED) {
    hasEnded = true;
  }
}

function createAlternatives(): void {
  const alternativesWrapper = document.getElementById("alternatives");
  const title = document.getElementById("title");
  const description = document.getElementById("description");

  if (!alternativesWrapper) return;
  if (!title) return;
  if (!description) return;

  // limpa as alternativas
  while (alternativesWrapper.firstChild) {
    alternativesWrapper.removeChild(alternativesWrapper.firstChild);
  }

  title.textContent = questions[currentQuestion].title
  description.textContent = questions[currentQuestion].description

  for (let i = 0; i < questions[currentQuestion].options.length; i++) {
    const option = questions[currentQuestion].options[i]
    const divElement = document.createElement("div");
    divElement.className = "alternative hoverable";
    divElement.setAttribute("data-id", i.toString());

    const prefixSpan = document.createElement("span");
    prefixSpan.className = "prefix";
    prefixSpan.textContent = option.prefix;

    const textSpan = document.createElement("span");
    textSpan.className = "alternative-text";
    textSpan.textContent = option.text;

    divElement.appendChild(prefixSpan);
    divElement.appendChild(textSpan);

    divElement.addEventListener("click", function () {
      markAlternative(this)
    })

    alternativesWrapper.appendChild(divElement);
  }

  showQuestions()
}

function markAlternative(el: HTMLDivElement): void {
  if (shouldProceedToNextQuestion) return;

  const selectedAlternativeStr = el.dataset.id;
  if (!selectedAlternativeStr) return;

  const selectedAlternativeId = parseInt(selectedAlternativeStr);
  // se clicou na mesma duas vezes remove o status de marcado
  if (selectedAlternativeId == marked) {
    el.classList.remove("marked");
    el.classList.add("hoverable");
    lastMarked = undefined;
    marked = undefined;
  } else {
    el.classList.add("marked");
    el.classList.remove("hoverable");
    marked = selectedAlternativeId;
    lastMarked?.classList.remove("marked");
    lastMarked?.classList.add("hoverable");
    lastMarked = el;
  }
}

function hideQuestions() {
  const questionsDiv = document.getElementById("questions");
  const playerDiv = document.getElementById("player");
  if (!questionsDiv) return;
  if (!playerDiv) return;

  questionsDiv.style.display = "none";
  playerDiv.style.display = "block";
}

function showQuestions() {
  const questionsDiv = document.getElementById("questions");
  const playerDiv = document.getElementById("player");
  if (!questionsDiv) return;
  if (!playerDiv) return;

  questionsDiv.style.display = "block";
  playerDiv.style.display = "none";

  // sai da tela cheia caso esteja vendo o video em tela cheia
  if (document.fullscreenElement !== null) {
    document.exitFullscreen();
  }
}

function checkAlternative(): void {
  const statusDiv = document.getElementById("status");
  const submitB = document.getElementById("submit-b");
  if (!submitB) return;
  if (!statusDiv) return;

  if (shouldProceedToNextQuestion) {
    submitB.textContent = "Enviar";
    statusDiv.textContent = "";

    const action = questions[currentQuestion].action;

    currentQuestion += 1;
    shouldProceedToNextQuestion = false;

    if (action == "question") {
      createAlternatives();
    } else if (action == "video") {
      hideQuestions();
    } else {
      const resultsEl = document.getElementById("results");
      if (!resultsEl) return;
      resultsEl.textContent = `Você acertou ${correctAmount}/${questions.length}.`;
      resultsEl.style.display = "block";

      const questionsDiv = document.getElementById("questions");
      if (!questionsDiv) return;

      questionsDiv.style.display = "none";
    }

    return
  }

  if (!lastMarked) return;

  if (marked == questions[currentQuestion].correctAnswer) {
    lastMarked.style.backgroundColor = "rgb(60, 211, 158)";
    statusDiv.textContent = "Parabéns, você acertou!";
    correctAmount++;
  } else {
    lastMarked.style.backgroundColor = "rgb(255, 82, 82)";
    statusDiv.textContent = "Tente novamente da próxima vez";
  }

  submitB.textContent = "Continuar";

  shouldProceedToNextQuestion = true;
  lastMarked = undefined;
  marked = undefined;
}

function setOnlyQuestions() {
  const onlyQuestionsButton = document.getElementById("only-questions-button");
  if (!onlyQuestionsButton) return;

  questions.forEach(v => {
    if (v.action == "video") v.action = "question";
  })

  onlyQuestionsButton.style.display = "none";

  if (player) player.pauseVideo();

  createAlternatives()
  if (timer != null) {
    clearInterval(timer);
    timer = null
  }
}

async function main() {
  const submitAnswerButton = document.getElementById("submit-b");
  if (!submitAnswerButton) return;

  submitAnswerButton.addEventListener("click", checkAlternative);
  try {
    const url = new URL(window.location.href);
    const trackFileId = url.searchParams.get("id");

    if (!trackFileId) {
      showErrorAlert("Id não recebido");
      return;
    }

    const trackFileLocation = `/data/${trackFileId}.json`;

    const responseObj = await fetch(trackFileLocation);
    const responseText = await responseObj.text();
    sessionInfo = JSON.parse(responseText);
    questions = sessionInfo.questions

    if (trackFileId.startsWith("r")) { // é uma revisão
      createAlternatives()
    } else {
      if (sessionInfo.videoid) {
        const tag = document.createElement('script');

        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag.parentNode == null) return;

        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }
  } catch (e) {
    showErrorAlert("Erro ao carregar a página");
    console.error(e);
  }
}

function showErrorAlert(msg: string) {
  Swal.fire(
    "Erro",
    msg,
    'error'
  );
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    videoId: sessionInfo.videoid,
    events: {
      'onStateChange': onPlayerStateChange
    }
  });

  const playerDiv = document.getElementById("player");
  if (!playerDiv) return;

  playerDiv.style.display = "block";

  const onlyQuestions = document.getElementById("only-questions-button");
  if (!onlyQuestions) return;

  onlyQuestions.style.display = "block";
  onlyQuestions.addEventListener("click", setOnlyQuestions);
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady
main()
