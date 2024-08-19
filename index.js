import mongoose from "mongoose";
import dotenv from "dotenv";
import amqp from "amqplib/callback_api.js";
import { handel_problem_submission } from "./controllers/problem_submission_controller.js";
import { handel_playground_submission } from "./controllers/playground_submission_controller.js";

dotenv.config();

const handel_submission = (submission_data) => {
    if (submission_data.type == "problem_submission") {
        handel_problem_submission(submission_data.submission);
        return;
    }

    if (submission_data.type == "playground_submission") {
        handel_playground_submission(submission_data.submission);
        return;
    }

    console.log(`submission of type ${submission_data.type} not supported`);
};

const connectToMongoDB = async () => {
    try {
        mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to mongoDB database");
    } catch (err) {
        throw err;
    }
};

const connectToRabbitMQ = async () => {
    try {
        amqp.connect(process.env.RABBIT_MQ_URI, function (error, connection) {
            if (error) {
                throw error;
            }

            connection.createChannel(function (error, channel) {
                if (error) {
                    throw error;
                }

                channel.assertQueue("processed_submission", {
                    durable: false,
                });

                console.log("waiting for messages...");

                channel.consume(
                    "processed_submission",
                    function (msg) {
                        const submission_data = JSON.parse(
                            msg.content.toString()
                        );

                        handel_submission(submission_data);
                    },
                    {
                        noAck: true,
                    }
                );
            });
        });

        console.log("Connected to rabbitMQ");
    } catch (err) {
        throw err;
    }
};

connectToMongoDB();
connectToRabbitMQ();
