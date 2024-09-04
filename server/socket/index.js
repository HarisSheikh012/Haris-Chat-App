const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const UserModel = require('../models/UserModel');
const { ConversationModel, MessageModel } = require('../models/ConversationModel');
const getConversation = require('../helpers/getConversation');

const app = express();

// Create server and initialize Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
    },
});

// Track online users
const onlineUser = new Set();

io.on('connection', async (socket) => {
    console.log("User connected: ", socket.id);

    const token = socket.handshake.auth.token;

    // Get user details from token
    const user = await getUserDetailsFromToken(token);

    if (user) {
        socket.join(user._id.toString());
        onlineUser.add(user._id.toString());
        io.emit('onlineUser', Array.from(onlineUser));
    } else {
        console.error('User not found or token invalid');
        socket.disconnect();  // Disconnect the socket if user is not valid
        return;
    }

    // Handle 'message-page' event
    socket.on('message-page', async (userId) => {
        try {
            const userDetails = await UserModel.findById(userId).select("-password");
            const payload = {
                _id: userDetails?._id,
                name: userDetails?.name,
                email: userDetails?.email,
                profile_pic: userDetails?.profile_pic,
                online: onlineUser.has(userId),
            };
            socket.emit('message-user', payload);

            // Get previous messages
            const conversation = await ConversationModel.findOne({
                "$or": [
                    { sender: user._id, receiver: userId },
                    { sender: userId, receiver: user._id },
                ]
            }).populate('messages').sort({ updatedAt: -1 });

            socket.emit('message', conversation?.messages || []);
        } catch (error) {
            console.error('Error fetching message-page:', error);
        }
    });

    // Handle 'new message' event
    socket.on('new message', async (data) => {
        try {
            // Check if conversation exists
            let conversation = await ConversationModel.findOne({
                "$or": [
                    { sender: data.sender, receiver: data.receiver },
                    { sender: data.receiver, receiver: data.sender },
                ]
            });

            // Create a new conversation if none exists
            if (!conversation) {
                conversation = await new ConversationModel({
                    sender: data.sender,
                    receiver: data.receiver,
                }).save();
            }

            // Save the new message
            const message = new MessageModel({
                text: data.text,
                imageUrl: data.imageUrl,
                videoUrl: data.videoUrl,
                msgByUserId: data.msgByUserId,
            });
            const savedMessage = await message.save();

            // Update conversation with the new message
            await ConversationModel.updateOne({ _id: conversation._id }, {
                "$push": { messages: savedMessage._id },
            });

            // Emit updated messages to both sender and receiver
            const updatedConversation = await ConversationModel.findOne({
                "$or": [
                    { sender: data.sender, receiver: data.receiver },
                    { sender: data.receiver, receiver: data.sender },
                ]
            }).populate('messages').sort({ updatedAt: -1 });

            io.to(data.sender).emit('message', updatedConversation?.messages || []);
            io.to(data.receiver).emit('message', updatedConversation?.messages || []);

            // Send updated conversation to both users
            const conversationSender = await getConversation(data.sender);
            const conversationReceiver = await getConversation(data.receiver);

            io.to(data.sender).emit('conversation', conversationSender);
            io.to(data.receiver).emit('conversation', conversationReceiver);
        } catch (error) {
            console.error('Error handling new message:', error);
        }
    });

    // Handle 'sidebar' event
    socket.on('sidebar', async (currentUserId) => {
        try {
            const conversation = await getConversation(currentUserId);
            socket.emit('conversation', conversation);
        } catch (error) {
            console.error('Error fetching sidebar:', error);
        }
    });

    // Handle 'seen' event
    socket.on('seen', async (msgByUserId) => {
        try {
            const conversation = await ConversationModel.findOne({
                "$or": [
                    { sender: user._id, receiver: msgByUserId },
                    { sender: msgByUserId, receiver: user._id },
                ]
            });

            const conversationMessageId = conversation?.messages || [];

            await MessageModel.updateMany(
                { _id: { "$in": conversationMessageId }, msgByUserId: msgByUserId },
                { "$set": { seen: true } }
            );

            // Emit updated conversation to both users
            const conversationSender = await getConversation(user._id.toString());
            const conversationReceiver = await getConversation(msgByUserId);

            io.to(user._id.toString()).emit('conversation', conversationSender);
            io.to(msgByUserId).emit('conversation', conversationReceiver);
        } catch (error) {
            console.error('Error handling seen status:', error);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (user) {
            onlineUser.delete(user._id.toString());
            io.emit('onlineUser', Array.from(onlineUser));
        }
        console.log('User disconnected: ', socket.id);
    });
});

module.exports = {
    app,
    server
};
