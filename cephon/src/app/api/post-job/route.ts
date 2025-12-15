import Computer from "tzafon";
import OpenAI from "openai";
import { SYSTEM_PROMPT, executeAction, formatAction, type Action } from "@/lib/agent";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

const MAX_STEPS = 50;

export async function POST() {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to send SSE messages immediately
  const sendEvent = async (data: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Run automation in background
  (async () => {
    let computer: Awaited<ReturnType<Computer["create"]>> | null = null;
    let stepCount = 0;

    try {
      // Initialize clients
      await sendEvent({ type: "step", step: ++stepCount, message: "Initializing browser and AI..." });

      const tzafonClient = new Computer();
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      computer = await tzafonClient.create({ kind: "browser" });

      // Get credentials
      const email = process.env.UPWORK_EMAIL;
      const password = process.env.UPWORK_PASSWORD;

      if (!email || !password) {
        throw new Error("Missing Upwork credentials in environment");
      }

      // Define the task
      const task = `You are logging into Upwork and posting a job. Follow these steps:

1. You are on the Upwork login page. Find the email/username input field and click on it.
2. Type the email: ${email}
3. Find and click the "Continue" or "Log In" button to proceed.
4. Wait for the password field to appear, then click on it.
5. Type the password: ${password}
6. Find and click the "Log In" button.
7. Wait for the dashboard to load. If you see any popups or modals, close them.
8. Navigate to post a new job (look for "Post a Job" link/button or go to the job posting page).
9. Fill in the job title: "Test Job Posting - Please Ignore"
10. Fill in the job description: "This is a test job posting for automation testing purposes. Please ignore this listing."
11. Complete the job posting form as needed.
12. When the job is posted or you've completed the form, respond with {"action": "done", "result": "Job posted successfully"}

Important:
- Wait after each action for the page to update before deciding the next action
- If you see a CAPTCHA or security challenge, respond with {"action": "done", "result": "Security challenge detected - cannot proceed"}
- If you encounter an error, describe it in the done result
- Look carefully at the screenshot to identify the correct elements to click`;

      // Navigate to Upwork login
      await sendEvent({ type: "step", step: ++stepCount, message: "Navigating to Upwork login page..." });
      await computer.navigate("https://www.upwork.com/ab/account-security/login");
      await computer.wait(3);

      // Take initial screenshot
      let screenshot = await computer.screenshot();
      let screenshotUrl = screenshot.result?.screenshot_url;
      let viewportWidth = screenshot.page_context?.viewport_width || 1280;
      let viewportHeight = screenshot.page_context?.viewport_height || 720;

      if (screenshotUrl) {
        await sendEvent({ type: "screenshot", url: screenshotUrl });
      }

      // Message history for the conversation
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      // Agent loop
      for (let step = 0; step < MAX_STEPS; step++) {
        // Take screenshot
        screenshot = await computer.screenshot();
        screenshotUrl = screenshot.result?.screenshot_url;
        viewportWidth = screenshot.page_context?.viewport_width || viewportWidth;
        viewportHeight = screenshot.page_context?.viewport_height || viewportHeight;

        if (!screenshotUrl) {
          await sendEvent({ type: "step", step: ++stepCount, message: "Failed to capture screenshot" });
          continue;
        }

        // Send screenshot to frontend
        await sendEvent({ type: "screenshot", url: screenshotUrl });

        // Build message with screenshot (OpenAI format matching CUA template)
        const userMessage: OpenAI.Chat.ChatCompletionMessageParam = {
          role: "user",
          content: [
            {
              type: "text",
              text: `Task: ${task}

Viewport: ${viewportWidth}x${viewportHeight}

Analyze this screenshot and decide the next action. Remember: Use 0-999 grid coordinates where (0,0) is top-left and (999,999) is bottom-right.`,
            },
            {
              type: "image_url",
              image_url: {
                url: screenshotUrl,
              },
            },
          ],
        };

        messages.push(userMessage);

        // Call OpenAI to decide the next action
        await sendEvent({ type: "step", step: ++stepCount, message: "AI analyzing screenshot..." });

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 1024,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
        });

        // Extract the response text
        const responseText = response.choices[0].message.content || "";
        console.log(`Step ${step + 1}: ${responseText}`);

        // Add assistant response to history
        messages.push({ role: "assistant", content: responseText });

        // Parse the action - extract JSON from response
        let action: Action;
        try {
          // Try to extract JSON from the response (it might have text before/after)
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            action = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found in response");
          }
        } catch {
          await sendEvent({
            type: "step",
            step: ++stepCount,
            message: `Failed to parse AI response: ${responseText.substring(0, 100)}`,
          });
          continue;
        }

        // Send action to frontend
        const actionDescription = formatAction(action);
        await sendEvent({ type: "step", step: ++stepCount, message: `Action: ${actionDescription}` });

        // Execute the action
        const shouldContinue = await executeAction(computer, action, viewportWidth, viewportHeight);

        // Wait a bit for the page to update
        await computer.wait(0.5);

        // Check if done
        if (!shouldContinue || action.action === "done") {
          await sendEvent({
            type: "step",
            step: ++stepCount,
            message: `Completed: ${action.result || "Task finished"}`,
          });

          // Take final screenshot
          const finalScreenshot = await computer.screenshot();
          if (finalScreenshot.result?.screenshot_url) {
            await sendEvent({ type: "screenshot", url: finalScreenshot.result.screenshot_url });
          }

          break;
        }
      }

      // Signal completion
      await sendEvent({ type: "complete" });
    } catch (err) {
      console.error("Automation error:", err);
      await sendEvent({
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error occurred",
      });
    } finally {
      // Clean up - terminate the browser
      if (computer) {
        try {
          await computer.terminate();
        } catch (e) {
          console.error("Failed to terminate browser:", e);
        }
      }
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
