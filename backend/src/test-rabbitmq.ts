/**
 * RabbitMQ连接测试脚本
 * 用于验证RabbitMQ TypeScript实现是否正常工作
 */

import * as amqp from "amqplib";
import { getLogger } from "./utils/logger";

const logger = getLogger("RabbitMQTest");

interface RabbitMQConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  vhost: string;
}

const config: RabbitMQConfig = {
  host: process.env.RABBITMQ_HOST || "localhost",
  port: parseInt(process.env.RABBITMQ_PORT || "5672"),
  username: process.env.RABBITMQ_USERNAME || "ocr-user",
  password: process.env.RABBITMQ_PASSWORD || "ocr-password",
  vhost: process.env.RABBITMQ_VHOST || "/ocr-app",
};

/**
 * 测试RabbitMQ连接
 */
async function testConnection(): Promise<void> {
  let connection: amqp.Connection | null = null;
  let channel: amqp.Channel | null = null;

  try {
    logger.info("开始测试RabbitMQ连接...");

    // 构建连接URL
    const connectionUrl = `amqp://${config.username}:${config.password}@${config.host}:${config.port}${config.vhost}`;

    // 连接到RabbitMQ
    logger.info("正在连接到RabbitMQ...", {
      host: config.host,
      port: config.port,
      vhost: config.vhost,
    });
    connection = (await amqp.connect(connectionUrl)) as unknown as amqp.Connection;
    logger.info("✅ RabbitMQ连接成功");

    // 创建通道
    logger.info("正在创建通道...");
    channel = (await (connection as any).createChannel()) as amqp.Channel;
    logger.info("✅ 通道创建成功");

    // 测试队列操作
    if (channel) {
      await testQueueOperations(channel);
    }

    logger.info("🎉 所有测试通过！");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ RabbitMQ测试失败", { error: errorMessage });
    throw error;
  } finally {
    // 清理资源
    try {
      if (channel) {
        await channel.close();
        logger.info("通道已关闭");
      }
      if (connection) {
        await (connection as any).close();
        logger.info("连接已关闭");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("清理资源时发生错误", { error: errorMessage });
    }
  }
}

/**
 * 测试队列基本操作
 */
async function testQueueOperations(channel: amqp.Channel): Promise<void> {
  const testQueueName = "test-queue";
  const testMessage = { message: "Hello RabbitMQ!", timestamp: new Date().toISOString() };

  try {
    logger.info("测试队列操作...");

    // 声明队列
    logger.info(`声明测试队列: ${testQueueName}`);
    await channel.assertQueue(testQueueName, {
      durable: true,
      autoDelete: true,
    });
    logger.info("✅ 队列声明成功");

    // 发送消息
    logger.info("发送测试消息...");
    const messageBuffer = Buffer.from(JSON.stringify(testMessage));
    const published = channel.sendToQueue(testQueueName, messageBuffer, {
      persistent: true,
      messageId: "test-message-1",
      timestamp: Date.now(),
    });

    if (published) {
      logger.info("✅ 消息发送成功");
    } else {
      throw new Error("消息发送失败");
    }

    // 消费消息
    logger.info("开始消费消息...");
    let messageReceived = false;

    await channel.consume(
      testQueueName,
      (msg) => {
        if (msg) {
          try {
            const receivedMessage = JSON.parse(msg.content.toString());
            logger.info("✅ 消息接收成功", {
              message: receivedMessage,
              messageId: msg.properties.messageId,
            });

            // 确认消息
            channel.ack(msg);
            messageReceived = true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("处理消息失败", { error: errorMessage });
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );

    // 等待消息被处理
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (messageReceived) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // 超时处理
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!messageReceived) {
          throw new Error("消息接收超时");
        }
      }, 5000);
    });

    // 删除测试队列
    logger.info("清理测试队列...");
    await channel.deleteQueue(testQueueName);
    logger.info("✅ 测试队列已删除");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("队列操作测试失败", { error: errorMessage });
    throw error;
  }
}

/**
 * 测试交换机操作
 */
async function testExchangeOperations(channel: amqp.Channel): Promise<void> {
  const testExchangeName = "test-exchange";
  const testQueueName = "test-queue-exchange";
  const routingKey = "test.routing.key";

  try {
    logger.info("测试交换机操作...");

    // 声明交换机
    logger.info(`声明测试交换机: ${testExchangeName}`);
    await channel.assertExchange(testExchangeName, "direct", {
      durable: false,
      autoDelete: true,
    });
    logger.info("✅ 交换机声明成功");

    // 声明队列并绑定到交换机
    await channel.assertQueue(testQueueName, { autoDelete: true });
    await channel.bindQueue(testQueueName, testExchangeName, routingKey);
    logger.info("✅ 队列绑定成功");

    // 通过交换机发送消息
    const testMessage = { message: "Hello Exchange!", timestamp: new Date().toISOString() };
    const messageBuffer = Buffer.from(JSON.stringify(testMessage));

    channel.publish(testExchangeName, routingKey, messageBuffer, {
      persistent: false,
      messageId: "test-exchange-message-1",
    });
    logger.info("✅ 通过交换机发送消息成功");

    // 清理
    await channel.deleteQueue(testQueueName);
    await channel.deleteExchange(testExchangeName);
    logger.info("✅ 交换机测试完成");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("交换机操作测试失败", { error: errorMessage });
    throw error;
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    logger.info("🚀 开始RabbitMQ TypeScript测试");
    await testConnection();
    logger.info("✨ 所有测试完成！");
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("💥 测试失败", { error: errorMessage });
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

export { testConnection, testQueueOperations };
