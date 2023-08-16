'use server';

import {revalidatePath} from 'next/cache';
import Thread from '../models/thread.model';
import User from '../models/user.model';
import {connectToDB} from '../mongoose';

interface Params {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

export async function createThread({text, author, communityId, path}: Params) {
  try {
    connectToDB();

    const createdThread = await Thread.create({
      text,
      author,
      community: null,
    });

    // Update user model
    await User.findByIdAndUpdate(author, {
      $push: {threads: createdThread._id},
    });

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }
}

export async function fetchThreads(pageNumber = 1, pageSize = 20) {
  try {
    connectToDB();

    // Calculate the number of posts to skip
    const skipAmount = (pageNumber - 1) * pageSize;

    // Fetch the posts that have no parents (top level threads...)
    const threadsQuery = Thread.find({parentId: {$in: [null, undefined]}})
      .sort({createdAt: 'desc'})
      .skip(skipAmount)
      .limit(pageSize)
      .populate({path: 'author', model: 'User'})
      .populate({
        path: 'children',
        populate: {
          path: 'author',
          model: User,
          select: '_id name parentId image',
        },
      });

    const totalPostsCount = await Thread.countDocuments({
      parentId: {$in: [null, undefined]},
    });

    const threads = await threadsQuery.exec();

    const isNext = totalPostsCount > skipAmount + threads.length;

    return {threads, isNext};
  } catch (error: any) {
    throw new Error(`Failed to fetch threads: ${error.message}`);
  }
}

export async function fetchThreadById(id: string) {
  connectToDB();

  // TODO: Populate community
  try {
    const thread = await Thread.findById(id)
      .populate({
        path: 'author',
        model: User,
        select: '_id name image',
      })
      .populate({
        path: 'children',
        populate: [
          {
            path: 'author',
            model: User,
            select: '_id name parentId image',
          },
          {
            path: 'children',
            model: Thread,
            populate: {
              path: 'author',
              model: User,
              select: '_id id name parentId image',
            },
          },
        ],
      })
      .exec();

    return thread;
  } catch (error: any) {
    throw new Error(`Failed to fetch thread by that id: ${error.message}`);
  }
} 

export async function addCommentToThread(
  threadId: string,
  commentText: string,
  userId: string,
  path: string,
) {
  connectToDB();

  try {
    // Find the original thread by it's ID
    const originalThread = await Thread.findById(threadId);

    if (!originalThread) {
      throw new Error('Thread not found');
    }

    // Create new thread with the comment text
    const commentThread = new Thread({
      text: commentText,
      author: userId,
      parentId: threadId,
    });

    // Save the new thread
    const savedCommentThread = await commentThread.save();

    // Update the original thread to include comment
    originalThread.children.push(savedCommentThread._id);

    // Save original thread
    originalThread.save();

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Error adding comment to thread: ${error.message}`);
  }
}
