/** @format */
// ChatIcon.js
import React, { useState, useEffect, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { MessageOutlined } from "@ant-design/icons";
import ChatWindow from "./ChatWindow";
import { getUnseenMessagesCountByCustomer } from "../apiCore";
import { getSocket } from "./socket";
import ReactGA from "react-ga4";
import { useCartContext } from "../cart_context";

const notificationSound = "/Notification.wav";

/* --------------------------------- Animations --------------------------------- */

// Simple blink animation for the status dot
const blink = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
`;

/* --------------------------------- Styled Components --------------------------------- */

const ChatIconWrapper = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  display: flex; /* So we can center items horizontally if needed */
  align-items: center;

  @media (max-width: 750px) {
    bottom: 30px;
  }
`;

const ChatButtonBox = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--neutral-darker); /* or your preferred color */
  padding: 10px 14px;
  border-radius: 50px;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.25);
  transition:
    transform 0.2s ease,
    background-color 0.2s ease;
  cursor: pointer;

  &:hover {
    transform: scale(1.05);
    background-color: #0b69d6; /* Slightly lighter or darker variant */
  }

  /* Icon on the left */
  .icon-holder {
    color: #fff;
    margin-right: 8px;
    font-size: 20px; /* Adjust icon size */
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Text on the right */
  .chat-text {
    display: flex;
    flex-direction: column;
    color: #fff;
    text-align: left;
    font-weight: bold;
    line-height: 1.2;

    .chat-name {
      font-size: 14px;
      margin-bottom: 3px;
    }

    .chat-status {
      font-size: 12px;
      font-weight: normal;
      display: flex;
      align-items: center;

      /* The green blinking dot */
      .status-dot {
        width: 8px;
        height: 8px;
        background-color: #00ff00;
        border-radius: 50%;
        margin-right: 5px;
        animation: ${blink} 3s infinite;
      }

      /* Red circle for unseen messages (like a mini badge) */
      .unseen-count {
        background-color: red;
        color: white;
        border-radius: 50%;
        font-size: 10px;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 10px;
      }
    }
  }

  /* Responsive tweaks */
  @media (max-width: 750px) {
    padding: 8px 10px;

    .icon-holder {
      font-size: 18px;
      margin-right: 6px;
    }

    .chat-text {
      .chat-name {
        font-size: 13px;
      }
      .chat-status {
        font-size: 10px;
      }
    }
  }
`;

/* --------------------------------- Component --------------------------------- */

const ChatIcon = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const { websiteSetup } = useCartContext();

  const toggleChatWindow = () => {
    ReactGA.event({
      category: "User Open Chat Window",
      action: "User Open Chat Window",
    });
    setIsOpen((prev) => !prev);

    // Reset unseen count when opening the chat
    if (!isOpen) {
      setUnseenCount(0);
    }
  };

  const fetchUnseenMessagesCount = useCallback(async () => {
    try {
      const caseId = JSON.parse(localStorage.getItem("currentChat"))?.caseId;
      if (caseId) {
        const response = await getUnseenMessagesCountByCustomer(caseId);
        setUnseenCount(response.count);
      }
    } catch (error) {
      console.error("Error fetching unseen messages count:", error);
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    if (hasInteracted) {
      const audio = new Audio(notificationSound);
      audio.play();
    }
  }, [hasInteracted]);

  const handleUserInteraction = useCallback(() => {
    setHasInteracted(true);
    document.removeEventListener("click", handleUserInteraction);
  }, []);

  // Fetch unseen messages count periodically if chat is closed
  useEffect(() => {
    if (!isOpen) {
      fetchUnseenMessagesCount();
      const interval = setInterval(() => {
        fetchUnseenMessagesCount();
      }, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchUnseenMessagesCount]);

  // Listen for new messages
  useEffect(() => {
    if (!hasInteracted) return undefined;

    const socket = getSocket();

    const handleReceiveMessage = () => {
      if (!isOpen) {
        playNotificationSound();
        fetchUnseenMessagesCount();
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);
    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [hasInteracted, isOpen, playNotificationSound, fetchUnseenMessagesCount]);

  // Allow playing sound on user interaction
  useEffect(() => {
    document.addEventListener("click", handleUserInteraction);
    return () => {
      document.removeEventListener("click", handleUserInteraction);
    };
  }, [handleUserInteraction]);

  return (
    <ChatIconWrapper>
      {/* Only the button toggles the chat window, so clicks in ChatWindow won't close it */}
      <ChatButtonBox onClick={toggleChatWindow}>
        <div className="icon-holder">
          <MessageOutlined />
        </div>
        <div className="chat-text">
          <div className="chat-name">Help / Support</div>
          <div className="chat-status">
            <span className="status-dot" />
            Chat Available
            {unseenCount > 0 && (
              <span className="unseen-count">{unseenCount}</span>
            )}
          </div>
        </div>
      </ChatButtonBox>

      {/* The chat window is shown/hidden based on isOpen */}
      {isOpen && (
        <ChatWindow
          closeChatWindow={toggleChatWindow}
          websiteSetup={websiteSetup}
        />
      )}
    </ChatIconWrapper>
  );
};

export default ChatIcon;
