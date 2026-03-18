/** @format */
// ChatIcon.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { MessageOutlined } from "@ant-design/icons";
import ChatWindow from "./ChatWindow";
import { getUnseenMessagesCountByCustomer } from "../apiCore";
import { getSocket } from "./socket";
import ReactGA from "react-ga4";
import { useCartContext } from "../cart_context";

const notificationSound = "/Notification.wav";
const UNSEEN_COUNT_POLL_INTERVAL_MS = 10000;
const UNSEEN_COUNT_RETRY_BACKOFF_MS = 60000;
const UNSEEN_COUNT_REQUEST_DEDUPE_MS = 3000;

let lastUnseenCountRequest = {
  caseId: "",
  at: 0,
};

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
    right: 12px;
    bottom: 12px;
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
    background-color 0.2s ease,
    opacity 0.2s ease,
    visibility 0.2s ease;
  cursor: pointer;
  opacity: ${(props) => (props.$isOpen ? 0 : 1)};
  visibility: ${(props) => (props.$isOpen ? "hidden" : "visible")};
  pointer-events: ${(props) => (props.$isOpen ? "none" : "auto")};
  transform: ${(props) =>
    props.$isOpen ? "translateY(10px)" : "translateY(0)"};

  &:hover {
    transform: ${(props) =>
      props.$isOpen ? "translateY(10px)" : "scale(1.05)"};
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
    padding: 7px 10px;
    border-radius: 18px;

    .icon-holder {
      font-size: 15px;
      margin-right: 5px;
    }

    .chat-text {
      .chat-name {
        font-size: 11px;
        margin-bottom: 1px;
      }
      .chat-status {
        font-size: 9px;

        .status-dot {
          width: 6px;
          height: 6px;
          margin-right: 4px;
        }

        .unseen-count {
          width: 16px;
          height: 16px;
          font-size: 9px;
          margin-left: 6px;
        }
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
  const unseenCountBackoffRef = useRef({
    caseId: "",
    retryAfter: 0,
  });

  const getStoredChat = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem("currentChat") || "null");
    } catch (error) {
      console.warn("Ignoring invalid stored chat snapshot:", error);
      return null;
    }
  }, []);

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

  const fetchUnseenMessagesCount = useCallback(
    async (options = {}) => {
      const { force = false } = options;

      try {
        const storedChat = getStoredChat();
        const caseId = storedChat?.caseId;

        if (!caseId) {
          setUnseenCount(0);
          return;
        }

        if (storedChat?.caseStatus && storedChat.caseStatus !== "open") {
          setUnseenCount(0);
          return;
        }

        if (
          !force &&
          typeof document !== "undefined" &&
          document.visibilityState === "hidden"
        ) {
          return;
        }

        const now = Date.now();
        const backoffState = unseenCountBackoffRef.current;
        if (
          !force &&
          backoffState.caseId === caseId &&
          backoffState.retryAfter > now
        ) {
          return;
        }

        if (
          !force &&
          lastUnseenCountRequest.caseId === caseId &&
          now - lastUnseenCountRequest.at < UNSEEN_COUNT_REQUEST_DEDUPE_MS
        ) {
          return;
        }

        lastUnseenCountRequest = {
          caseId,
          at: now,
        };

        const response = await getUnseenMessagesCountByCustomer(caseId);
        setUnseenCount(Number(response?.count) || 0);

        if (response?.caseStatus && response.caseStatus !== "open") {
          unseenCountBackoffRef.current = {
            caseId,
            retryAfter: now + UNSEEN_COUNT_RETRY_BACKOFF_MS,
          };
          return;
        }

        if (response?.exists === false || response?.unavailable) {
          unseenCountBackoffRef.current = {
            caseId,
            retryAfter: now + UNSEEN_COUNT_RETRY_BACKOFF_MS,
          };
          return;
        }

        unseenCountBackoffRef.current = {
          caseId: "",
          retryAfter: 0,
        };
      } catch (error) {
        const storedChat = getStoredChat();
        unseenCountBackoffRef.current = {
          caseId: storedChat?.caseId || "",
          retryAfter: Date.now() + UNSEEN_COUNT_RETRY_BACKOFF_MS,
        };
        console.warn("Customer unseen-count check skipped after error:", error);
      }
    },
    [getStoredChat],
  );

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
      }, UNSEEN_COUNT_POLL_INTERVAL_MS);
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
        fetchUnseenMessagesCount({ force: true });
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
      <ChatButtonBox $isOpen={isOpen} onClick={toggleChatWindow}>
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
