import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      // 首次连接，发送一个连接成功的通知
      controller.enqueue(encoder.encode("event: open\ndata: connected\n\n"));

      // 定期轮询
      intervalId = setInterval(async () => {
        try {
          const unreadCount = await prisma.notification.count({
            where: {
              userId,
              isRead: false,
            },
          });

          // 封装当前未读数返回给客户端
          const payload = JSON.stringify({ unreadCount });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch (error) {
          console.error("[SSE] 轮询异常:", error);
        }
      }, 8000); // 8秒更新一次
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
