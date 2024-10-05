import mongoose from "mongoose";
import { Submission } from "../models/Submission.js";
import { User } from "../models/User.js";
import { Problem } from "../models/Problem.js";
import { redisClient } from "../index.js";
import { Contest } from "../models/Contest.js";

export const handel_contest_submission = async (submission, contest_id) => {
    const submission_id = submission._id;
    await Submission.findByIdAndUpdate(submission_id, submission);

    if (submission.error) {
        if (!submission.throwaway) {
            const problem = await Problem.findById(submission.problem_id);
            problem.wrong_submissions += 1;
            await problem.save();
            const user = await User.findById(submission.user_id);
            user.submissions
                ? user.submissions.push(submission_id)
                : (user.submissions = [submission_id]);
            await user.save();
        }

        return;
    }

    if (!submission.throwaway) {
        const user_id = submission.user_id;
        const problem_id = submission.problem_id;

        const problem = await Problem.findById(problem_id);
        const user = await User.findById(user_id);

        user.submissions
            ? user.submissions.push(submission_id)
            : (user.submissions = [submission_id]);
        if (
            submission.result === "AC" &&
            (!user.solved_problems ||
                !user.solved_problems.includes(problem_id))
        ) {
            user.solved_problems
                ? user.solved_problems.push(problem_id)
                : (user.solved_problems = [problem_id]);
            problem.correct_submissions += 1;
        }
        if (submission.result == "WA") {
            problem.wrong_submissions += 1;
        }
        await user.save();
        await problem.save();

        const contest = await Contest.findById(contest_id);
        const stringfied_leaderboard_data = await redisClient.get(
            contest_id.toString()
        );

        let leaderboard_data = await JSON.parse(stringfied_leaderboard_data);
        leaderboard_data = leaderboard_data ? leaderboard_data : {};

        let to_save = false;
        if (!leaderboard_data[user_id]) {
            const problem_score = contest.problems.filter(
                (problem_data) => problem_data.problem._id === problem_id
            ).score;

            leaderboard_data[user_id] = {
                score: problem_score,
                [submission.problem_id]: 1,
                username: user.username,
            };
            to_save = true;
        } else if (!leaderboard_data[user_id][problem_id]) {
            const problem_score = contest.problems.filter(
                (problem_data) => problem_data.problem._id === problem_id
            ).score;
            leaderboard_data[user_id].score += problem_score;
            leaderboard_data[user_id][problem_id] = 1;
            to_save = true;
        }

        if (to_save) {
            const stringfied_leaderboard_data =
                JSON.stringify(leaderboard_data);

            await redisClient.set(contest_id, stringfied_leaderboard_data);
        }
    }

    return;
};
