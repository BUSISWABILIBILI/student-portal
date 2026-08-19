import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const clientDir = path.join(rootDir, "client");
const apiPort = Number(process.env.E2E_API_PORT || 5100);
const webPort = Number(process.env.E2E_WEB_PORT || 5175);
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const timeoutMs = 30000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const demoUsers = {
  "admin@studentportal.local": {
    id: 1,
    firstName: "Portal",
    lastName: "Administrator",
    fullName: "Portal Administrator",
    email: "admin@studentportal.local",
    role: "admin",
    isActive: true,
  },
  "student@studentportal.local": {
    id: 2,
    firstName: "Demo",
    lastName: "Student",
    fullName: "Demo Student",
    email: "student@studentportal.local",
    role: "student",
    isActive: true,
    studentProfile: {
      id: 7,
      studentNumber: "STU20260001",
      programme: "Diploma in Information Technology",
      yearLevel: 1,
    },
  },
};

const demoCourse = {
  id: 1,
  courseCode: "DEV101",
  courseName: "Introduction to Software Development",
  description: "Foundational software development concepts.",
  department: "Information Technology",
  creditValue: 12,
  capacity: 50,
  enrolledCount: 12,
  availablePlaces: 38,
  isFull: false,
  isActive: true,
};

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Origin": webUrl,
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(body));
};

const readBody = (request) =>
  new Promise((resolve) => {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk;
    });
    request.on("end", () => {
      resolve(rawBody ? JSON.parse(rawBody) : {});
    });
  });

const getUserFromRequest = (request) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (token === "admin-token") {
    return demoUsers["admin@studentportal.local"];
  }

  if (token === "student-token") {
    return demoUsers["student@studentportal.local"];
  }

  return null;
};

const startMockApi = () =>
  new Promise((resolve) => {
    const server = http.createServer(async (request, response) => {
      const url = new URL(request.url, apiUrl);
      const route = `${request.method} ${url.pathname}`;

      if (request.method === "OPTIONS") {
        sendJson(response, 204, {});
        return;
      }

      if (route === "GET /api/health") {
        sendJson(response, 200, {
          success: true,
          message: "Student Portal API is running.",
        });
        return;
      }

      if (route === "POST /api/auth/login") {
        const body = await readBody(request);
        const user = demoUsers[body.email];
        const password =
          user?.role === "admin" ? "Admin@123" : "Student@123";

        if (!user || body.password !== password) {
          sendJson(response, 401, {
            success: false,
            message: "Invalid email or password.",
          });
          return;
        }

        sendJson(response, 200, {
          success: true,
          message: "Login successful.",
          data: {
            accessToken: `${user.role}-token`,
            user,
          },
        });
        return;
      }

      const user = getUserFromRequest(request);

      if (!user) {
        sendJson(response, 401, {
          success: false,
          message: "Authentication is required.",
        });
        return;
      }

      if (route === "GET /api/auth/me") {
        sendJson(response, 200, {
          success: true,
          data: { user },
        });
        return;
      }

      if (route === "POST /api/auth/logout") {
        sendJson(response, 200, {
          success: true,
          message: "Logout successful. Remove the access token from the client.",
        });
        return;
      }

      if (route === "GET /api/dashboard/admin") {
        sendJson(response, 200, {
          success: true,
          data: {
            dashboard: {
              users: { total: 2, students: 1 },
              courses: { active: 1 },
              enrollments: { registered: 1 },
              results: { published: 1 },
              announcements: { published: 1 },
              recentStudents: [demoUsers["student@studentportal.local"]],
            },
          },
        });
        return;
      }

      if (route === "GET /api/dashboard/student") {
        sendJson(response, 200, {
          success: true,
          data: {
            dashboard: {
              enrollments: { registered: 1, completed: 0 },
              academicPerformance: {
                publishedResults: 1,
                earnedCredits: 12,
                averageMark: 74,
                gpa: 3,
              },
              recentResults: [
                {
                  id: 1,
                  finalMark: 74,
                  course: {
                    courseCode: demoCourse.courseCode,
                    courseName: demoCourse.courseName,
                  },
                },
              ],
            },
          },
        });
        return;
      }

      if (route === "GET /api/courses") {
        sendJson(response, 200, {
          success: true,
          data: {
            courses: [demoCourse],
            pagination: { page: 1, limit: 50, totalItems: 1, totalPages: 1 },
          },
        });
        return;
      }

      if (route === "GET /api/academic-periods/active") {
        sendJson(response, 200, {
          success: true,
          data: {
            academicPeriods: [
              {
                id: 1,
                name: "2026 First Semester",
                academicYear: 2026,
                registrationOpen: true,
              },
            ],
          },
        });
        return;
      }

      if (route === "GET /api/enrollments") {
        sendJson(response, 200, {
          success: true,
          data: {
            enrollments: [
              {
                id: 1,
                status: "registered",
                student: demoUsers["student@studentportal.local"],
                course: demoCourse,
                academicPeriod: { id: 1, name: "2026 First Semester" },
                result: null,
              },
            ],
            pagination: { page: 1, limit: 100, totalItems: 1, totalPages: 1 },
          },
        });
        return;
      }

      if (route === "GET /api/enrollments/me") {
        sendJson(response, 200, {
          success: true,
          data: {
            courses: [
              {
                id: 1,
                status: "registered",
                course: demoCourse,
                academicPeriod: { id: 1, name: "2026 First Semester" },
              },
            ],
          },
        });
        return;
      }

      if (route === "GET /api/results") {
        sendJson(response, 200, {
          success: true,
          data: {
            results: [
              {
                id: 1,
                enrollmentId: 1,
                courseworkMark: 76,
                examinationMark: 72,
                finalMark: 73.6,
                grade: "B",
                outcome: "pass",
                publicationStatus: "draft",
                student: { name: "Demo Student", studentNumber: "STU20260001" },
                course: demoCourse,
                academicPeriod: { label: "2026 First Semester" },
              },
            ],
          },
        });
        return;
      }

      if (route === "GET /api/results/me") {
        sendJson(response, 200, {
          success: true,
          data: {
            results: [],
            academicSummary: {
              totalPublishedResults: 1,
              completedCourses: 1,
              passedCourses: 1,
              earnedCredits: 12,
              averageMark: 74,
              gpa: 3,
            },
          },
        });
        return;
      }

      if (route === "GET /api/announcements" || route === "GET /api/announcements/me") {
        sendJson(response, 200, {
          success: true,
          data: {
            announcements: [
              {
                id: 1,
                title: "Registration notice",
                content: "Course registration is open.",
                targetType: "all",
                targetRole: null,
                priority: "normal",
                publicationStatus: "published",
                publishAt: new Date().toISOString(),
                expiresAt: null,
                createdBy: { fullName: "Portal Administrator" },
              },
            ],
          },
        });
        return;
      }

      if (route === "GET /api/users") {
        sendJson(response, 200, {
          success: true,
          data: {
            users: Object.values(demoUsers),
            pagination: { page: 1, limit: 50, totalItems: 2, totalPages: 1 },
          },
        });
        return;
      }

      sendJson(response, 404, {
        success: false,
        message: `No mock route for ${route}`,
      });
    });

    server.listen(apiPort, "127.0.0.1", () => resolve(server));
  });

const findBrowserExecutable = () => {
  const candidates = [
    process.env.E2E_BROWSER_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
};

const waitForHttp = async (url, { expectStatus = 200 } = {}) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.status === expectStatus) {
        return response;
      }
    } catch {
      // Keep waiting while the process starts.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
};

const startProcess = ({ command, args, cwd, env, readyUrl }) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let settled = false;
    let output = "";

    const finish = (error, processHandle) => {
      if (settled) {
        return;
      }

      settled = true;

      if (error) {
        reject(error);
        return;
      }

      resolve(processHandle);
    };

    const appendOutput = (chunk) => {
      output += chunk.toString();
    };

    child.stdout.on("data", appendOutput);
    child.stderr.on("data", appendOutput);
    child.once("exit", (code) => {
      finish(
        new Error(
          `${command} exited before ready with code ${code}.\n${output}`,
        ),
      );
    });
    child.once("error", finish);

    waitForHttp(readyUrl)
      .then(() => finish(null, child))
      .catch((error) => finish(error));
  });

const stopProcess = async (child) => {
  if (!child || child.killed) {
    return;
  }

  child.kill("SIGTERM");

  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(3000).then(() => {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }),
  ]);
};

class CdpPage {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);

    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });

    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (!message.id || !this.pending.has(message.id)) {
        return;
      }

      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message));
        return;
      }

      resolve(message.result);
    });

    await this.send("Page.enable");
    await this.send("Runtime.enable");
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;

    this.socket.send(JSON.stringify({ id, method, params }));

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  async evaluate(expression) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.text);
    }

    return response.result.value;
  }

  async waitFor(expression, message) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const value = await this.evaluate(expression);

      if (value) {
        return value;
      }

      await delay(250);
    }

    const bodyText = await this.evaluate("document.body.innerText");

    throw new Error(`${message}\n\nCurrent page text:\n${bodyText}`);
  }

  async close() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}

const launchBrowser = async (url) => {
  const executablePath = findBrowserExecutable();

  assert(
    executablePath,
    "Chrome or Edge was not found. Set E2E_BROWSER_PATH to a Chromium browser.",
  );

  const userDataDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "student-portal-e2e-"),
  );
  const browser = spawn(
    executablePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    {
      stdio: ["ignore", "ignore", "pipe"],
    },
  );

  const portFile = path.join(userDataDir, "DevToolsActivePort");
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs && !fs.existsSync(portFile)) {
    await delay(100);
  }

  assert(fs.existsSync(portFile), "Timed out waiting for browser debug port.");

  const [port] = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/);
  const targetResponse = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`,
    {
      method: "PUT",
    },
  );
  const target = await targetResponse.json();
  const page = new CdpPage(target.webSocketDebuggerUrl);

  await page.connect();

  return { browser, page, userDataDir };
};

const clickByText = async (page, text) => {
  await page.evaluate(`(() => {
    const candidates = [...document.querySelectorAll("button, a")];
    const element = candidates.find((node) => node.textContent.trim() === ${JSON.stringify(text)});

    if (!element) {
      throw new Error("Could not find clickable text: ${text}");
    }

    element.click();
    return true;
  })()`);
};

const fillField = async (page, name, value) => {
  await page.evaluate(`(() => {
    const element = document.querySelector('[name="${name}"]');

    if (!element) {
      throw new Error("Could not find field: ${name}");
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    );

    descriptor.set.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
};

const expectText = async (page, text) => {
  await page.waitFor(
    `document.body.innerText.toLowerCase().includes(${JSON.stringify(
      text.toLowerCase(),
    )})`,
    `Expected page text: ${text}`,
  );
};

const expectNoText = async (page, text) => {
  const hasText = await page.evaluate(
    `document.body.innerText.toLowerCase().includes(${JSON.stringify(
      text.toLowerCase(),
    )})`,
  );

  assert(!hasText, `Unexpected page text: ${text}`);
};

const signIn = async (page, email, password) => {
  await fillField(page, "email", email);
  await fillField(page, "password", password);
  await clickByText(page, "Sign in");
};

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const run = async () => {
  const api = await startMockApi();
  const web = await startProcess({
    command: process.execPath,
    args: [
      path.join(clientDir, "node_modules", "vite", "bin", "vite.js"),
      "--host",
      "127.0.0.1",
      "--port",
      String(webPort),
      "--strictPort",
    ],
    cwd: clientDir,
    env: {
      VITE_API_URL: `${apiUrl}/api`,
    },
    readyUrl: webUrl,
  });
  let browser;
  let page;
  let userDataDir;

  try {
    ({ browser, page, userDataDir } = await launchBrowser(webUrl));

    await expectText(page, "Sign in");
    await signIn(page, "admin@studentportal.local", "Admin@123");
    await expectText(page, "Institution dashboard");
    await expectText(page, "Users");

    await clickByText(page, "Courses");
    await expectText(page, "Course setup");
    await clickByText(page, "Results");
    await expectText(page, "Capture result");
    await clickByText(page, "Announcements");
    await expectText(page, "New announcement");
    await clickByText(page, "Users");
    await expectText(page, "New student");

    await clickByText(page, "Sign out");
    await expectText(page, "Sign in");
    await signIn(page, "student@studentportal.local", "Student@123");
    await expectText(page, "My dashboard");
    await expectNoText(page, "Users");
    await clickByText(page, "Courses");
    await expectText(page, "Academic period");
    await clickByText(page, "Results");
    await expectText(page, "Published results");
    await clickByText(page, "Announcements");
    await expectText(page, "Registration notice");

    console.log("Browser smoke test passed.");
  } finally {
    await page?.close();
    browser?.kill("SIGTERM");
    await stopProcess(web);
    await closeServer(api);

    if (userDataDir) {
      fs.rmSync(userDataDir, { force: true, recursive: true });
    }
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
