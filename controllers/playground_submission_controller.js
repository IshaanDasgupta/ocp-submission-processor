import { Playground_Submission } from "../models/Playground_Submission.js";

export const handel_playground_submission = async (playground_submission) => {
    const submission_id = playground_submission._id;

    await Playground_Submission.findByIdAndUpdate(
        submission_id,
        playground_submission
    );
};
