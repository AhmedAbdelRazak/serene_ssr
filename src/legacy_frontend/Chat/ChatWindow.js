/** @format
 *  ChatWindow.js  – Serene Jannat Marketplace
 *  ------------------------------------------------------------------
 *  Changes vs. the component you provided:
 *    • message list is strictly date‑sorted → correct ordering
 *    • optimistic send keeps UI snappy, but duplicates are filtered
 *    • agent URLs appear as “Click here” links (shortened)
 *    • ESLint warnings fixed (useMemo used, missing dependency added)
 *  The rest of the component—including all styling, labels, props,
 *  placeholders, Arabic text, autocomplete, rating flow, etc.—is
 *  untouched.
 *  ------------------------------------------------------------------
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Button, Input, Select, Form, Upload, message } from "antd";
import {
  createNewSupportCase,
  getSupportCaseById,
  updateSupportCase,
  updateSeenByCustomer,
  autoCompleteProducts,
  checkInvoiceNumber,
} from "../apiCore"; // adjust path if needed
import styled, { keyframes } from "styled-components";
import { getSocket } from "./socket";
import EmojiPicker from "emoji-picker-react";
import {
  UploadOutlined,
  CloseOutlined,
  WarningFilled,
  CustomerServiceFilled,
} from "@ant-design/icons";
import StarRatings from "react-star-ratings";
import { isAuthenticated } from "../auth";

const { Option } = Select;

/* ────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
   ──────────────────────────────────────────────────────────── */

const INQUIRY_TYPES = [
  { value: "order", label: "Inquiry about an Order" },
  { value: "product", label: "Inquiry about a Product" },
  { value: "other", label: "Other Inquiry" },
];

/** local id for optimistic messages */
const genLocalId = () =>
  `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** milliseconds range treated as “same” for dedup */
const TS_EPSILON = 10_000;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const END_CHAT_SUGGESTION_DELAY_MS = 5000;
const ACTIVE_TYPING_GRACE_MS = 4500;
const TYPING_HEARTBEAT_INTERVAL_MS = 1200;
const CHAT_LINK_STYLE = {
  color: "#1d4ed8",
  textDecoration: "underline",
  fontStyle: "italic",
  fontWeight: 600,
};

const normalizeContactValue = (value = "") => {
  const nextValue = `${value || ""}`;
  return nextValue.includes("@") ? nextValue.toLowerCase() : nextValue;
};

const normalizeSeedText = (value = "") =>
  `${value || ""}`.replace(/\s+/g, " ").trim().toLowerCase();

const getInquiryTypeDisplayLabel = (value = "", isArabic = false) => {
  if (isArabic) {
    switch (value) {
      case "order":
        return "استفسار عن طلب";
      case "product":
        return "استفسار عن منتج";
      case "other":
        return "استفسار عام";
      default:
        return "طلب دعم";
    }
  }

  return (
    INQUIRY_TYPES.find((option) => option.value === value)?.label ||
    "Support Request"
  );
};

const getLinkLabel = (url, shorten = false) => {
  if (!shorten) return url;

  if (/track|tracking|usps|ups|fedex|dhl/i.test(url)) {
    return "Track order";
  }

  if (/\/custom-gifts\/.+\?occasion=/i.test(url)) {
    return "View design";
  }

  if (/\/custom-gifts\?occasion=/i.test(url)) {
    return "View designs";
  }

  if (/\/custom-gifts\/|\/single-product\/|\/our-products\//i.test(url)) {
    return "View product";
  }

  return "Visit page";
};

const renderMessageText = (text, shortenLinks = false) =>
  `${text || ""}`.split("\n").map((line, lineIndex, allLines) => (
    <React.Fragment key={`line-${lineIndex}`}>
      {line.split(URL_REGEX).map((part, partIndex) =>
        /^https?:\/\/[^\s]+$/i.test(part) ? (
          <a
            href={part}
            key={`part-${lineIndex}-${partIndex}`}
            target="_blank"
            rel="noreferrer"
            title={part}
            style={CHAT_LINK_STYLE}
          >
            {getLinkLabel(part, shortenLinks)}
          </a>
        ) : (
          <React.Fragment key={`part-${lineIndex}-${partIndex}`}>
            {part}
          </React.Fragment>
        ),
      )}
      {lineIndex < allLines.length - 1 && <br />}
    </React.Fragment>
  ));

/* ────────────────────────────────────────────────────────────
   COMPONENT
   ──────────────────────────────────────────────────────────── */

const ChatWindow = ({ closeChatWindow, chosenLanguage, websiteSetup }) => {
  /* ════════════════════════════════════════════════════════
	   0) BASIC STATE
	   ════════════════════════════════════════════════════════ */
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [inquiryAbout, setInquiryAbout] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [productName, setProductName] = useState("");
  const [otherInquiry, setOtherInquiry] = useState("");
  const [storeId, setStoreId] = useState(null);

  const [caseId, setCaseId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [caseStatus, setCaseStatus] = useState("open");
  const [closedBy, setClosedBy] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [typingStatus, setTypingStatus] = useState("");
  const [showEndChatPrompt, setShowEndChatPrompt] = useState(false);

  const [isRatingVisible, setIsRatingVisible] = useState(false);
  const [rating, setRating] = useState(0);

  const messagesEndRef = useRef(null);
  const endChatSuggestionTimerRef = useRef(null);
  const customerTypingIdleTimerRef = useRef(null);
  const isCustomerTypingRef = useRef(false);
  const draftMessageRef = useRef("");
  const lastCustomerKeystrokeAtRef = useRef(0);
  const hasPendingEndChatSuggestionRef = useRef(false);
  const submittedRef = useRef(false);
  const caseStatusRef = useRef("open");
  const isRatingVisibleRef = useRef(false);

  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSelectedProduct, setHasSelectedProduct] = useState(false);
  const selectedProductNameRef = useRef("");

  /* ==> optimistic bookkeeping */
  const pendingLocalIds = useRef(new Set());

  /* memo: lowercase email (used in comparisons) */
  const lowerCustomerEmail = useMemo(
    () => (customerEmail ? customerEmail.toLowerCase() : ""),
    [customerEmail],
  );
  const isMine = useCallback(
    (msg) =>
      msg.messageBy?.customerEmail &&
      lowerCustomerEmail &&
      msg.messageBy.customerEmail.toLowerCase() === lowerCustomerEmail,
    [lowerCustomerEmail],
  );
  const hasSupportReply = useMemo(
    () => messages.some((msg) => !isMine(msg)),
    [messages, isMine],
  );
  const submittedRequestSummary = useMemo(() => {
    if (!submitted || !messages.length) return null;

    const firstMessage = messages[0];
    const firstMessageText = normalizeSeedText(firstMessage?.message || "");
    const inquiryDetails = normalizeSeedText(
      firstMessage?.inquiryDetails || firstMessage?.message || "",
    );
    const firstSenderContact = normalizeContactValue(
      firstMessage?.messageBy?.customerEmail || "",
    );
    const currentContact = normalizeContactValue(customerEmail || "");
    const belongsToCustomer =
      !firstSenderContact ||
      !currentContact ||
      firstSenderContact === currentContact;

    if (
      !belongsToCustomer ||
      !firstMessageText ||
      firstMessageText !== inquiryDetails
    ) {
      return null;
    }

    return {
      inquiryAbout: firstMessage?.inquiryAbout || inquiryAbout || "other",
      inquiryDetails:
        `${firstMessage?.inquiryDetails || firstMessage?.message || ""}`.trim(),
      submittedAt: firstMessage?.date || null,
    };
  }, [submitted, messages, customerEmail, inquiryAbout]);
  const visibleMessages = useMemo(
    () => (submittedRequestSummary ? messages.slice(1) : messages),
    [messages, submittedRequestSummary],
  );
  const isAwaitingFirstSupportReply =
    submitted &&
    caseStatus === "open" &&
    messages.length > 0 &&
    !hasSupportReply;
  const contactLooksLikePhone = useMemo(() => {
    const normalizedContact = normalizeContactValue(customerEmail);
    return Boolean(
      normalizedContact &&
      !normalizedContact.includes("@") &&
      /^[+\d().\s-]+$/.test(normalizedContact),
    );
  }, [customerEmail]);
  const socket = useMemo(() => getSocket(), []);

  const syncSupportCaseState = useCallback((supportCase) => {
    if (!supportCase) return false;
    if (Array.isArray(supportCase.conversation)) {
      setMessages(sortByDate(supportCase.conversation));
    }
    setCaseStatus(supportCase.caseStatus || "open");
    setClosedBy(supportCase.closedBy || null);
    if (typeof supportCase.rating === "number") {
      setRating(supportCase.rating);
    }
    return true;
  }, []);

  const fetchSupportCase = useCallback(
    async (id) => {
      try {
        if (!id) return;
        const supCase = await getSupportCaseById(id);
        syncSupportCaseState(supCase);
      } catch (err) {
        console.error("Error fetching support case:", err);
      }
    },
    [syncSupportCaseState],
  ); //  ← empty dependency array keeps the reference stable

  const clearEndChatSuggestionTimer = useCallback(() => {
    if (endChatSuggestionTimerRef.current) {
      clearTimeout(endChatSuggestionTimerRef.current);
      endChatSuggestionTimerRef.current = null;
    }
  }, []);

  const clearCustomerTypingTimer = useCallback(() => {
    if (customerTypingIdleTimerRef.current) {
      clearInterval(customerTypingIdleTimerRef.current);
      customerTypingIdleTimerRef.current = null;
    }
  }, []);

  const resetEndChatSuggestion = useCallback(() => {
    clearEndChatSuggestionTimer();
    hasPendingEndChatSuggestionRef.current = false;
    setShowEndChatPrompt(false);
  }, [clearEndChatSuggestionTimer]);

  const stopCustomerTypingSession = useCallback(
    ({ force = false } = {}) => {
      clearCustomerTypingTimer();
      const wasTyping = isCustomerTypingRef.current;
      isCustomerTypingRef.current = false;
      lastCustomerKeystrokeAtRef.current = 0;

      if (caseId && (wasTyping || force)) {
        socket.emit("stopTyping", { caseId, user: customerName });
      }
    },
    [caseId, clearCustomerTypingTimer, customerName, socket],
  );

  const startCustomerTypingSession = useCallback(() => {
    if (!caseId) return;

    setTypingStatus("");
    resetEndChatSuggestion();
    isCustomerTypingRef.current = true;
    socket.emit("typing", { caseId, user: customerName });

    if (customerTypingIdleTimerRef.current) {
      return;
    }

    customerTypingIdleTimerRef.current = setInterval(() => {
      if (!draftMessageRef.current.trim()) {
        stopCustomerTypingSession();
        return;
      }

      if (
        !lastCustomerKeystrokeAtRef.current ||
        Date.now() - lastCustomerKeystrokeAtRef.current > ACTIVE_TYPING_GRACE_MS
      ) {
        stopCustomerTypingSession();
        return;
      }

      socket.emit("typing", { caseId, user: customerName });
    }, TYPING_HEARTBEAT_INTERVAL_MS);
  }, [
    caseId,
    customerName,
    resetEndChatSuggestion,
    socket,
    stopCustomerTypingSession,
  ]);

  const resetChatState = useCallback(() => {
    stopCustomerTypingSession({ force: true });
    if (endChatSuggestionTimerRef.current) {
      clearTimeout(endChatSuggestionTimerRef.current);
      endChatSuggestionTimerRef.current = null;
    }
    localStorage.removeItem("currentChat");
    pendingLocalIds.current.clear();
    selectedProductNameRef.current = "";
    isCustomerTypingRef.current = false;
    hasPendingEndChatSuggestionRef.current = false;
    submittedRef.current = false;
    caseStatusRef.current = "open";
    isRatingVisibleRef.current = false;
    setCaseId("");
    setSubmitted(false);
    setCaseStatus("open");
    setClosedBy(null);
    setMessages([]);
    setNewMessage("");
    setShowEmojiPicker(false);
    setFileList([]);
    setTypingStatus("");
    setShowEndChatPrompt(false);
    setIsRatingVisible(false);
    setRating(0);
    setInquiryAbout("");
    setOrderNumber("");
    setProductName("");
    setOtherInquiry("");
    setStoreId(null);
    setProductSuggestions([]);
    setShowSuggestions(false);
    setHasSelectedProduct(false);
  }, [stopCustomerTypingSession]);

  const scheduleEndChatPrompt = useCallback(() => {
    clearEndChatSuggestionTimer();

    if (
      !submittedRef.current ||
      caseStatusRef.current !== "open" ||
      isRatingVisibleRef.current ||
      isCustomerTypingRef.current ||
      !hasPendingEndChatSuggestionRef.current
    ) {
      return;
    }

    endChatSuggestionTimerRef.current = setTimeout(() => {
      endChatSuggestionTimerRef.current = null;

      if (
        !submittedRef.current ||
        caseStatusRef.current !== "open" ||
        isRatingVisibleRef.current ||
        isCustomerTypingRef.current ||
        !hasPendingEndChatSuggestionRef.current
      ) {
        return;
      }

      setTypingStatus("");
      setShowEndChatPrompt(true);
    }, END_CHAT_SUGGESTION_DELAY_MS);
  }, [clearEndChatSuggestionTimer]);

  useEffect(() => {
    return () => {
      clearEndChatSuggestionTimer();
      stopCustomerTypingSession({ force: true });
    };
  }, [clearEndChatSuggestionTimer, stopCustomerTypingSession]);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  useEffect(() => {
    caseStatusRef.current = caseStatus;
  }, [caseStatus]);

  useEffect(() => {
    isRatingVisibleRef.current = isRatingVisible;
  }, [isRatingVisible]);

  useEffect(() => {
    draftMessageRef.current = newMessage;
  }, [newMessage]);

  useEffect(() => {
    if (caseStatus !== "open" || isRatingVisible) {
      resetEndChatSuggestion();
    }
  }, [caseStatus, isRatingVisible, resetEndChatSuggestion]);

  /* ════════════════════════════════════════════════════════
	   1) ON‑MOUNT  – restore cached chat, pre‑fill user
	   ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (isAuthenticated()) {
      const { user } = isAuthenticated();
      setCustomerName(user.name || "");
      setCustomerEmail(normalizeContactValue(user.email || user.phone || ""));
    }

    const saved = JSON.parse(localStorage.getItem("currentChat") || "null");
    if (saved?.caseId) {
      setCaseId(saved.caseId);
      setCustomerName(saved.customerName || "");
      setCustomerEmail(normalizeContactValue(saved.customerEmail || ""));
      setInquiryAbout(saved.inquiryAbout || "");
      setOrderNumber(saved.orderNumber || "");
      setProductName(saved.productName || "");
      setOtherInquiry(saved.otherInquiry || "");
      setStoreId(saved.storeId || null);
      setSubmitted(saved.submitted || false);
      setCaseStatus(saved.caseStatus || "open");
      setClosedBy(saved.closedBy || null);
      setMessages(sortByDate(saved.messages || []));

      /* now safe because fetchSupportCase is memoised */
      fetchSupportCase(saved.caseId);
    }
  }, [fetchSupportCase]);

  /* ════════════════════════════════════════════════════════
	   2) JOIN / LEAVE SOCKET ROOM
	   ════════════════════════════════════════════════════════ */
  useEffect(() => {
    const handleSocketConnect = () => {
      if (caseId) {
        socket.emit("joinRoom", { caseId });
      }
    };

    handleSocketConnect();
    socket.on("connect", handleSocketConnect);

    return () => {
      socket.off("connect", handleSocketConnect);
      if (caseId) socket.emit("leaveRoom", { caseId });
    };
  }, [caseId, socket]);

  /* ════════════════════════════════════════════════════════
	   3) SOCKET LISTENERS
	   ════════════════════════════════════════════════════════ */
  useEffect(() => {
    function syncCaseConversation(updatedCase) {
      if (
        updatedCase?._id !== caseId ||
        !Array.isArray(updatedCase?.conversation)
      ) {
        return false;
      }

      syncSupportCaseState(updatedCase);
      setTypingStatus("");
      pendingLocalIds.current.clear();
      markMessagesAsSeen(caseId);
      return true;
    }

    function handleReceiveMessage(msgData) {
      const isCurrentCaseMessage =
        msgData?._id === caseId ||
        msgData?.caseId === caseId ||
        msgData?.case?._id === caseId;

      if (isCurrentCaseMessage) {
        resetEndChatSuggestion();
      }

      if (syncCaseConversation(msgData)) return;
      if (syncCaseConversation(msgData?.case)) return;
      if (msgData?.caseId !== caseId) return;

      setMessages((prev) => {
        /* filter optimistic duplicate */
        const filtered = prev.filter(
          (m) =>
            !m.local ||
            !(
              m.message === msgData.message &&
              m.messageBy?.customerEmail === msgData.messageBy?.customerEmail &&
              Math.abs(new Date(m.date) - new Date(msgData.date)) < TS_EPSILON
            ),
        );
        return sortByDate([...filtered, msgData]);
      });
      setTypingStatus("");
      pendingLocalIds.current.clear();
      markMessagesAsSeen(caseId);
    }

    function handleCloseCase(data) {
      if (data?.case?._id !== caseId) return;
      syncSupportCaseState(data.case);
      setTypingStatus("");
      if (data?.closedBy !== "client") {
        setIsRatingVisible(false);
      }
    }

    function handleSupportCaseUpdated(updatedCase) {
      syncCaseConversation(updatedCase);
    }

    const handleTyping = (info) => {
      if (info.caseId === caseId && info.user !== customerName) {
        if (isCustomerTypingRef.current) {
          setTypingStatus("");
          return;
        }

        setShowEndChatPrompt(false);
        setTypingStatus(`${info.user} is typing`);
      }
    };
    const handleStopTyping = (info) => {
      if (info.caseId === caseId && info.user !== customerName) {
        setTypingStatus("");
      }
    };

    const handleSupportEndChatSuggestion = (info) => {
      if (info?.caseId !== caseId || caseStatusRef.current !== "open") {
        return;
      }

      hasPendingEndChatSuggestionRef.current = true;
      setShowEndChatPrompt(false);
      scheduleEndChatPrompt();
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("supportCaseUpdated", handleSupportCaseUpdated);
    socket.on("closeCase", handleCloseCase);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("supportEndChatSuggestion", handleSupportEndChatSuggestion);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("supportCaseUpdated", handleSupportCaseUpdated);
      socket.off("closeCase", handleCloseCase);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("supportEndChatSuggestion", handleSupportEndChatSuggestion);
    };
  }, [caseId, customerName, customerEmail, socket, syncSupportCaseState]); // ← added missing dep

  /* ════════════════════════════════════════════════════════
	   4) LOCAL‑STORAGE SYNC + mark‑seen
	   ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!caseId) return;
    const snapshot = {
      caseId,
      customerName,
      customerEmail,
      inquiryAbout,
      orderNumber,
      productName,
      otherInquiry,
      storeId,
      submitted,
      caseStatus,
      closedBy,
      messages,
    };
    localStorage.setItem("currentChat", JSON.stringify(snapshot));
    markMessagesAsSeen(caseId);
  }, [
    caseId,
    customerName,
    customerEmail,
    inquiryAbout,
    orderNumber,
    productName,
    otherInquiry,
    storeId,
    submitted,
    caseStatus,
    closedBy,
    messages,
  ]);

  /* ════════════════════════════════════════════════════════
	   5) HELPERS – fetch / mark‑seen / sort
	   ════════════════════════════════════════════════════════ */

  async function markMessagesAsSeen(id) {
    try {
      if (id) await updateSeenByCustomer(id);
    } catch (err) {
      console.error("Error marking messages as seen:", err);
    }
  }
  function sortByDate(arr = []) {
    return [...arr].sort(
      (a, b) => new Date(a.date || 0) - new Date(b.date || 0),
    );
  }

  /* ════════════════════════════════════════════════════════
	   6) SCROLL TO BOTTOM ON NEW MESSAGE / TYPING
	   ════════════════════════════════════════════════════════ */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingStatus]);

  /* ════════════════════════════════════════════════════════
	   7) PRODUCT AUTOCOMPLETE
	   ════════════════════════════════════════════════════════ */
  useEffect(() => {
    let ignore = false;
    (async () => {
      const txt = productName.trim();
      if (inquiryAbout !== "product" || txt.length < 4) {
        if (!ignore) {
          setProductSuggestions([]);
          setShowSuggestions(false);
        }
        return;
      }
      if (
        hasSelectedProduct &&
        txt.length >= selectedProductNameRef.current.trim().length
      )
        return;

      try {
        const sugg = await autoCompleteProducts(txt);
        if (!ignore) {
          setProductSuggestions(sugg);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Error auto‑completing products:", err);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [inquiryAbout, productName, hasSelectedProduct]);

  const handleSelectProduct = (prod) => {
    setProductName(prod.productName);
    setStoreId(prod.store || null);
    selectedProductNameRef.current = prod.productName;
    setHasSelectedProduct(true);
    setShowSuggestions(false);
    setProductSuggestions([]);
  };

  /* ════════════════════════════════════════════════════════
	   8) ORDER / INVOICE VALIDATION
	   ════════════════════════════════════════════════════════ */
  async function checkOrderInvoice() {
    if (!orderNumber.trim()) return;
    try {
      const result = await checkInvoiceNumber(orderNumber.trim());
      result.found ? setStoreId(result.storeId || null) : setStoreId(null);
    } catch (err) {
      console.error("Error checking invoice:", err);
    }
  }

  /* ════════════════════════════════════════════════════════
	   9) CREATE SUPPORT CASE
	   ════════════════════════════════════════════════════════ */
  async function handleSubmit() {
    /* validation */
    if (!customerName.trim() || !customerEmail.trim()) {
      message.error("Please enter your name and email/phone.");
      return;
    }
    const normalizedContact = normalizeContactValue(customerEmail.trim());
    if (!isAuthenticated() && customerName.trim().split(" ").length < 2) {
      message.error("Please enter your full name (first and last).");
      return;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRx = /^[0-9]{10,15}$/;
    if (!emailRx.test(normalizedContact) && !phoneRx.test(normalizedContact)) {
      message.error("Enter a valid email or phone.");
      return;
    }
    if (!inquiryAbout) {
      message.error("Select what your inquiry is about.");
      return;
    }

    let detail = "";
    if (inquiryAbout === "order") {
      detail = orderNumber.trim();
      if (detail) await checkOrderInvoice();
    } else if (inquiryAbout === "product") {
      detail = productName.trim();
    } else {
      detail = otherInquiry.trim();
    }
    if (!detail) {
      message.error("Please provide details for your inquiry.");
      return;
    }

    const payload = {
      customerName,
      customerEmail: normalizedContact,
      displayName1: customerName,
      displayName2: "Platform Support",
      role: 0,
      storeId: storeId || null,
      inquiryAbout,
      inquiryDetails: detail || "General Inquiry",
      supporterId: "606060606060606060606060",
      ownerId: "606060606060606060606060",
    };

    try {
      const newCase = await createNewSupportCase(payload);
      setCustomerEmail(normalizedContact);
      setCaseId(newCase._id);
      setSubmitted(true);
      syncSupportCaseState(newCase);
    } catch (err) {
      console.error("Error creating support case:", err);
    }
  }

  /* ════════════════════════════════════════════════════════
	   10) SEND MESSAGE (optimistic)
	   ════════════════════════════════════════════════════════ */
  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    const normalizedContact = normalizeContactValue(customerEmail);
    const outgoingMessage = newMessage;

    const localId = genLocalId();
    const nowISO = new Date().toISOString();

    const optimistic = {
      _id: localId,
      caseId,
      local: true,
      senderType: "client",
      messageBy: { customerName, customerEmail: normalizedContact },
      message: outgoingMessage,
      date: nowISO,
    };

    setMessages((prev) => sortByDate([...prev, optimistic]));
    pendingLocalIds.current.add(localId);
    resetEndChatSuggestion();
    stopCustomerTypingSession({ force: true });
    setNewMessage("");

    try {
      await updateSupportCase(caseId, {
        conversation: {
          senderType: "client",
          messageBy: { customerName, customerEmail: normalizedContact },
          message: outgoingMessage,
          date: nowISO,
        },
      });
    } catch (err) {
      console.error("Error sending message:", err);
      message.error("Message failed to send. Please try again.");
      setMessages((prev) => prev.filter((m) => m._id !== localId));
      pendingLocalIds.current.delete(localId);
    }
  }

  /* ════════════════════════════════════════════════════════
	   11) RATING / CLOSE
	   ════════════════════════════════════════════════════════ */
  function handleCloseChat() {
    setIsRatingVisible(true);
  }
  async function handleRateService(val) {
    try {
      await updateSupportCase(caseId, {
        rating: val,
        caseStatus: "closed",
        closedBy: "client",
      });
      resetChatState();
      closeChatWindow();
      message.success("Thanks for your feedback!");
    } catch (err) {
      console.error("Error rating support case:", err);
    }
  }
  async function handleSkipRating() {
    try {
      await updateSupportCase(caseId, {
        caseStatus: "closed",
        closedBy: "client",
      });
      resetChatState();
      closeChatWindow();
    } catch (err) {
      console.error("Error skipping rating:", err);
    }
  }

  /* ════════════════════════════════════════════════════════
	   12) TYPING HANDLERS
	   ════════════════════════════════════════════════════════ */
  const handleInputChange = (e) => {
    const nextValue = e.target.value;
    setNewMessage(nextValue);

    if (nextValue.trim()) {
      lastCustomerKeystrokeAtRef.current = Date.now();
      startCustomerTypingSession();
    } else {
      stopCustomerTypingSession();
    }
  };
  const handleContactChange = (e) => {
    setCustomerEmail(normalizeContactValue(e.target.value));
  };
  const handleStopTypingLocal = () => {
    stopCustomerTypingSession({ force: true });
  };
  const handlePressEnter = (e) => {
    if (!e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /* ════════════════════════════════════════════════════════
	   13) EMOJI & FILE UPLOAD
	   ════════════════════════════════════════════════════════ */
  const handleEmojiClick = (emojiObj) => {
    setNewMessage((prev) => prev + emojiObj.emoji);
    draftMessageRef.current = `${draftMessageRef.current || ""}${emojiObj.emoji}`;
    lastCustomerKeystrokeAtRef.current = Date.now();
    startCustomerTypingSession();
    setShowEmojiPicker(false);
  };
  const handleFileChange = ({ fileList: list }) => setFileList(list);

  /* ════════════════════════════════════════════════════════
	   14) LINK RENDERER  (shortens agent URLs)
	   ════════════════════════════════════════════════════════ */
  const handleKeepChatOpen = () => {
    setIsRatingVisible(false);
  };

  const handleStartNewChat = () => {
    resetChatState();
  };

  const handleConfirmEndChatPrompt = () => {
    resetEndChatSuggestion();
    handleCloseChat();
  };

  const handleDismissEndChatPrompt = () => {
    resetEndChatSuggestion();
  };

  const isArabic = chosenLanguage === "Arabic";

  /* ════════════════════════════════════════════════════════
	   15) RENDER
	   ════════════════════════════════════════════════════════ */
  return (
    <ChatWindowWrapper dir={isArabic ? "rtl" : "ltr"}>
      {websiteSetup?.deactivateChatResponse && (
        <OfflineNotice>
          <span className="mr-1">
            <WarningFilled style={{ color: "#ff4d4f" }} />
          </span>
          <span>
            All our agents are currently away.
            <br />
            Please leave your name, e‑mail / phone and your question. One of our
            specialists will get back to you within the next business day.
          </span>
        </OfflineNotice>
      )}

      <Header>
        <h3>
          <CustomerServiceFilled className="mr-1" />
          {chosenLanguage === "Arabic" ? "دعم العملاء" : "Customer Support"}
        </h3>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={closeChatWindow}
          aria-label={isArabic ? "إغلاق نافذة الدعم" : "Close support window"}
        />
      </Header>

      {/* ─────────────── Rating Pane ─────────────── */}
      {isRatingVisible ? (
        <ScrollablePanel>
          <RatingContainer>
            <h4>
              {chosenLanguage === "Arabic" ? "قيم خدمتنا" : "Rate Our Service"}
            </h4>
            <StarRatings
              rating={rating}
              starRatedColor="#faad14"
              changeRating={setRating}
              numberOfStars={5}
              name="rating"
              starDimension="24px"
            />
            <p>
              {chosenLanguage === "Arabic"
                ? "إذا كنت منتهيًا، يمكنك تقييم المحادثة وإنهاؤها الآن أو إبقاؤها مفتوحة."
                : "If you're done, you can rate this chat and end it now, or keep it open."}
            </p>
            <div className="rating-buttons">
              <Button type="primary" onClick={() => handleRateService(rating)}>
                {chosenLanguage === "Arabic"
                  ? "إرسال التقييم"
                  : "Submit Rating"}
              </Button>
              <Button onClick={handleSkipRating}>
                {chosenLanguage === "Arabic" ? "تخطي" : "Skip"}
              </Button>
              <Button onClick={handleKeepChatOpen}>
                {chosenLanguage === "Arabic"
                  ? "إبقاء المحادثة مفتوحة"
                  : "Keep Chat Open"}
              </Button>
            </div>
          </RatingContainer>
        </ScrollablePanel>
      ) : submitted ? (
        /* ─────────────── Chat Area ─────────────── */
        <SubmittedChatLayout>
          <MessagesSection>
            {isAwaitingFirstSupportReply && (
              <CaseStatusNotice>
                {chosenLanguage === "Arabic"
                  ? "تم إرسال رسالتك. فريق الدعم يراجعها الآن."
                  : "Thanks, your message was sent. Support is reviewing it now."}
              </CaseStatusNotice>
            )}
            {submittedRequestSummary && (
              <SubmissionSummaryCard>
                <span className="eyebrow">
                  {chosenLanguage === "Arabic"
                    ? "تم إرسال طلب الدعم"
                    : "Support request submitted"}
                </span>
                <strong className="title">
                  {getInquiryTypeDisplayLabel(
                    submittedRequestSummary.inquiryAbout,
                    isArabic,
                  )}
                </strong>
                <p>{submittedRequestSummary.inquiryDetails}</p>
                {submittedRequestSummary.submittedAt && (
                  <small>
                    {new Date(
                      submittedRequestSummary.submittedAt,
                    ).toLocaleString()}
                  </small>
                )}
              </SubmissionSummaryCard>
            )}
            {visibleMessages.map((msg, index) => {
              const mine = isMine(msg);
              return (
                <MessageBubble
                  isMine={mine}
                  key={msg._id || `${msg.date || "message"}-${index}`}
                >
                  <strong>{msg.messageBy?.customerName || "Agent"}:</strong>{" "}
                  {renderMessageText(msg.message, !mine)}
                  <small>{new Date(msg.date).toLocaleString()}</small>
                </MessageBubble>
              );
            })}
            {typingStatus && (
              <TypingIndicator>
                <span className="typing-text">{typingStatus}</span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </TypingIndicator>
            )}
            <div ref={messagesEndRef} />
          </MessagesSection>

          {caseStatus === "open" ? (
            <ComposerSection>
              {showEndChatPrompt ? (
                <EndChatPrompt>
                  <strong>
                    {chosenLanguage === "Arabic"
                      ? "Ù‡Ù„ ØªÙˆØ¯ Ø¥Ù†Ù‡Ø§Ø¡ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© Ø§Ù„Ø¢Ù†ØŸ"
                      : "Would you like to end this chat now?"}
                  </strong>
                  <span>
                    {chosenLanguage === "Arabic"
                      ? "ÙŠÙ…ÙƒÙ†Ùƒ Ø¥Ù†Ù‡Ø§Ø¤Ù‡Ø§ Ø§Ù„Ø¢Ù† ÙˆØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©ØŒ Ø£Ùˆ Ø§Ù„Ø±Ø¬ÙˆØ¹ Ù„Ù„Ù…Ø­Ø§Ø¯Ø«Ø© Ø¥Ø°Ø§ ÙƒÙ†Øª ØªØ±ÙŠØ¯ Ù…Ø²ÙŠØ¯Ù‹Ø§ Ù…Ù† Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯Ø©."
                      : "You can end it now and leave a rating, or keep chatting if you still need help."}
                  </span>
                  <div className="actions">
                    <Button
                      danger
                      type="primary"
                      onClick={handleConfirmEndChatPrompt}
                    >
                      {chosenLanguage === "Arabic"
                        ? "Ù†Ø¹Ù…ØŒ Ø¥Ù†Ù‡Ø§Ø¡ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©"
                        : "Yes, End Chat"}
                    </Button>
                    <Button onClick={handleDismissEndChatPrompt}>
                      {chosenLanguage === "Arabic"
                        ? "Ù„Ø§ØŒ Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ù…Ø­Ø§Ø¯Ø«Ø©"
                        : "No, Keep Chat Open"}
                    </Button>
                  </div>
                </EndChatPrompt>
              ) : (
                <>
                  <ChatInputContainer>
                    <Input.TextArea
                      placeholder={
                        chosenLanguage === "Arabic"
                          ? "اكتب رسالتك..."
                          : "Type your message..."
                      }
                      value={newMessage}
                      onChange={handleInputChange}
                      onBlur={handleStopTypingLocal}
                      autoCapitalize="sentences"
                      autoCorrect="on"
                      spellCheck
                      enterKeyHint="send"
                      autoSize={{ minRows: 1, maxRows: 6 }}
                      onPressEnter={handlePressEnter}
                    />
                    <IconActionButton
                      data-emoji-trigger="true"
                      type="default"
                      onClick={() => setShowEmojiPicker((p) => !p)}
                      aria-label={
                        isArabic ? "فتح قائمة الإيموجي" : "Open emoji picker"
                      }
                    >
                      😀
                    </IconActionButton>
                    {showEmojiPicker && (
                      <EmojiPickerWrapper>
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                      </EmojiPickerWrapper>
                    )}
                    <Upload
                      fileList={fileList}
                      onChange={handleFileChange}
                      beforeUpload={() => false}
                    >
                      <IconActionButton
                        type="default"
                        icon={<UploadOutlined />}
                        aria-label={isArabic ? "رفع ملف" : "Upload file"}
                      />
                    </Upload>
                  </ChatInputContainer>

                  <Button
                    type="primary"
                    block
                    onClick={handleSendMessage}
                    style={{ marginTop: 8 }}
                  >
                    {chosenLanguage === "Arabic" ? "إرسال" : "Send"}
                  </Button>
                  <Button
                    type="default"
                    block
                    onClick={handleCloseChat}
                    style={{
                      marginTop: 8,
                      background: "#ff4d4f",
                      color: "#fff",
                    }}
                  >
                    <CloseOutlined />{" "}
                    {chosenLanguage === "Arabic"
                      ? "إنهاء المحادثة"
                      : "End Chat"}
                  </Button>
                </>
              )}
            </ComposerSection>
          ) : (
            <ClosedCaseNotice>
              <strong>
                {chosenLanguage === "Arabic"
                  ? "تم إغلاق هذه المحادثة."
                  : "This chat is closed."}
              </strong>
              <span>
                {closedBy === "system"
                  ? chosenLanguage === "Arabic"
                    ? "تم إنهاؤها تلقائيًا بعد 10 دقائق من عدم النشاط."
                    : "It was ended automatically after 10 minutes of inactivity."
                  : chosenLanguage === "Arabic"
                    ? "يمكنك بدء محادثة جديدة في أي وقت إذا احتجت للمزيد من المساعدة."
                    : "You can start a new chat any time if you need more help."}
              </span>
              <Button type="primary" onClick={handleStartNewChat}>
                {chosenLanguage === "Arabic"
                  ? "بدء محادثة جديدة"
                  : "Start New Chat"}
              </Button>
            </ClosedCaseNotice>
          )}
        </SubmittedChatLayout>
      ) : (
        /* ─────────────── Initial Form ─────────────── */
        <ScrollablePanel>
          <InitialForm layout="vertical" onFinish={handleSubmit}>
            <Form.Item label="Full Name" required>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your full name"
                autoCapitalize="words"
                autoComplete="name"
                disabled={isAuthenticated() && !!customerName}
                style={
                  isAuthenticated() && customerName
                    ? { background: "#f5f5f5", color: "#666" }
                    : undefined
                }
              />
            </Form.Item>

            <Form.Item label="Email or Mobile Number" required>
              <Input
                value={customerEmail}
                onChange={handleContactChange}
                placeholder="name@example.com or 5551234567"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode={contactLooksLikePhone ? "tel" : "email"}
                autoComplete={contactLooksLikePhone ? "tel" : "email"}
                dir="ltr"
                disabled={isAuthenticated() && !!customerEmail}
                style={
                  isAuthenticated() && customerEmail
                    ? { background: "#f5f5f5", color: "#666" }
                    : undefined
                }
              />
            </Form.Item>

            <Form.Item label="Inquiry About" required>
              <Select
                placeholder="Choose one"
                value={inquiryAbout || undefined}
                onChange={setInquiryAbout}
              >
                {INQUIRY_TYPES.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {inquiryAbout === "order" && (
              <Form.Item label="Order or Invoice Number" required>
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="For example: 8100273802"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  dir="ltr"
                />
              </Form.Item>
            )}

            {inquiryAbout === "product" && (
              <Form.Item label="Product Name" required>
                <ProductInputWrapper>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Start typing the product name"
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {showSuggestions && productSuggestions.length > 0 && (
                    <SuggestionsList>
                      {productSuggestions.map((prod) => (
                        <SuggestionItem
                          key={prod._id}
                          onClick={() => handleSelectProduct(prod)}
                        >
                          <strong>{prod.productName}</strong>
                          {prod.productSKU ? ` (SKU: ${prod.productSKU})` : ""}
                        </SuggestionItem>
                      ))}
                    </SuggestionsList>
                  )}
                </ProductInputWrapper>
              </Form.Item>
            )}

            {inquiryAbout === "other" && (
              <Form.Item label="Brief Description" required>
                <Input.TextArea
                  value={otherInquiry}
                  onChange={(e) => setOtherInquiry(e.target.value)}
                  placeholder="Tell us briefly what you need"
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  spellCheck
                  autoSize={{ minRows: 3, maxRows: 5 }}
                />
              </Form.Item>
            )}

            <Button type="primary" htmlType="submit" block>
              {chosenLanguage === "Arabic" ? "بدء المحادثة" : "Start Chat"}
            </Button>
          </InitialForm>
        </ScrollablePanel>
      )}
    </ChatWindowWrapper>
  );
};

export default ChatWindow;

/* ────────────────────────────────────────────────────────────
   STYLED COMPONENTS (identical except where commented)
   ──────────────────────────────────────────────────────────── */

const ChatWindowWrapper = styled.div`
  position: fixed;
  right: 18px;
  bottom: 78px;
  width: min(420px, calc(100vw - 24px));
  height: min(720px, calc(100dvh - 110px));
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid rgba(29, 41, 57, 0.12);
  border-radius: 18px;
  z-index: 1001;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  overscroll-behavior: contain;

  input,
  textarea,
  strong,
  .ant-select-selection-item,
  .ant-select-selection-placeholder {
    text-transform: none !important;
  }

  .ant-input,
  .ant-input-affix-wrapper,
  .ant-select-selector,
  .ant-btn {
    border-radius: 12px;
  }

  .ant-input,
  .ant-select-selector,
  textarea.ant-input {
    font-size: 16px;
  }

  @media (max-width: 768px) {
    left: 10px;
    right: 10px;
    bottom: calc(10px + env(safe-area-inset-bottom));
    width: auto;
    height: calc(100dvh - 68px - env(safe-area-inset-bottom));
    max-height: none;
    border-radius: 14px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  }
`;

const ScrollablePanel = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 16px 16px;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 768px) {
    padding: 0 12px 12px;
  }
`;

const SubmittedChatLayout = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;

  h3 {
    margin: 0;
    font-weight: 800;
    font-size: 1.1rem;
    line-height: 1.2;
    color: #1f2937;
  }

  .ant-btn {
    min-width: 40px;
    height: 40px;
    padding: 0;
    color: #b42318;
    font-weight: 700;
  }

  @media (max-width: 768px) {
    padding: 12px 12px 9px;

    h3 {
      font-size: 0.95rem;
    }

    .ant-btn {
      min-width: 36px;
      height: 36px;
      font-size: 1rem;
      color: #be123c;
      border-color: #fbcfe8;
      background: #fff1f2;
      box-shadow: 0 2px 8px rgba(190, 24, 93, 0.12);
      transform: translateY(4px);
    }
  }
`;

const MessagesSection = styled.div`
  flex: 1;
  min-height: 0;
  padding: 14px 16px 10px;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 768px) {
    padding: 10px 12px 6px;
  }
`;

const ComposerSection = styled.div`
  position: relative;
  padding: 12px 16px 16px;
  border-top: 1px solid #f1f5f9;
  background: #fff;

  > .ant-btn {
    height: 42px;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    padding: 8px 12px 10px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));

    > .ant-btn {
      height: 38px;
      border-radius: 10px;
      font-size: 0.88rem;
      padding-inline: 10px;
    }

    > .ant-btn.ant-btn-block {
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      width: calc(100% - 116px) !important;
      margin-top: 6px !important;
      vertical-align: top;
    }

    > .ant-btn.ant-btn-block + .ant-btn.ant-btn-block {
      width: 108px !important;
      margin-left: 8px;
      padding-inline: 8px;
      font-size: 0.8rem;
      background: #fff1f2;
      color: #e11d48;
      border-color: #fecdd3;
    }
  }
`;

const InitialForm = styled(Form)`
  padding-top: 14px;

  .ant-form-item {
    margin-bottom: 14px;
  }

  .ant-form-item-label > label {
    font-weight: 600;
    color: #374151;
  }

  .ant-select-selector,
  .ant-input,
  textarea.ant-input {
    min-height: 46px;
  }

  textarea.ant-input {
    min-height: 92px;
  }

  .ant-btn {
    height: 46px;
    margin-top: 4px;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    padding-top: 12px;

    .ant-form-item {
      margin-bottom: 12px;
    }

    .ant-form-item-label > label {
      font-size: 0.88rem;
    }

    .ant-select-selector,
    .ant-input,
    textarea.ant-input {
      min-height: 42px;
      font-size: 15px;
    }

    textarea.ant-input {
      min-height: 84px;
    }

    .ant-btn {
      height: 42px;
      font-size: 0.92rem;
    }
  }
`;

const CaseStatusNotice = styled.div`
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #eef6ff;
  color: #1f3b67;
  font-size: 0.92rem;
  line-height: 1.5;

  @media (max-width: 768px) {
    margin-bottom: 10px;
    padding: 10px 12px;
    font-size: 0.84rem;
  }
`;

const SubmissionSummaryCard = styled.div`
  margin-bottom: 12px;
  padding: 13px 14px;
  border-radius: 14px;
  border: 1px solid #dbe7f7;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f7ff 100%);
  color: #1f3b67;
  line-height: 1.5;

  .eyebrow {
    display: inline-block;
    margin-bottom: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #4f6b95;
  }

  .title {
    display: block;
    margin-bottom: 4px;
    font-size: 0.95rem;
    color: #16355e;
  }

  p {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  small {
    display: block;
    margin-top: 8px;
    font-size: 0.75rem;
    color: #667892;
  }

  @media (max-width: 768px) {
    margin-bottom: 10px;
    padding: 11px 12px;
    border-radius: 12px;
    font-size: 0.86rem;

    .eyebrow {
      margin-bottom: 4px;
      font-size: 0.66rem;
    }

    .title {
      font-size: 0.88rem;
    }

    small {
      margin-top: 6px;
      font-size: 0.68rem;
    }
  }
`;

const typingBounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;

  .typing-text {
    margin-right: 8px;
    font-style: italic;
    color: #666;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #666;
    margin: 0 2px;
    animation: ${typingBounce} 1s infinite ease-in-out;
  }
  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }
  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @media (max-width: 768px) {
    margin-top: 3px;

    .typing-text {
      margin-right: 6px;
      font-size: 0.82rem;
    }

    .dot {
      width: 5px;
      height: 5px;
      margin: 0 1.5px;
    }
  }
`;

const MessageBubble = styled.div`
  margin-bottom: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  line-height: 1.55;
  background: ${(props) => (props.isMine ? "#d2f8d2" : "#f5f5f5")};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;

  strong {
    display: block;
    margin-bottom: 4px;
  }

  a {
    font-weight: 600;
  }

  small {
    display: block;
    margin-top: 6px;
    font-size: 0.75rem;
    color: #888;
  }

  @media (max-width: 768px) {
    margin-bottom: 8px;
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 0.92rem;
    line-height: 1.45;

    strong {
      margin-bottom: 3px;
      font-size: 0.98rem;
    }

    small {
      margin-top: 5px;
      font-size: 0.68rem;
    }
  }
`;

const RatingContainer = styled.div`
  text-align: center;
  padding-top: 18px;

  p {
    margin: 12px 0 0;
    color: #666;
    line-height: 1.5;
  }

  .rating-buttons {
    margin-top: 16px;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
  }
`;

const ChatInputContainer = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: end;

  textarea {
    resize: none;
    min-height: 44px;
    max-height: 152px;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .ant-upload {
    display: block;
  }

  @media (max-width: 768px) {
    gap: 6px;

    textarea {
      min-height: 40px;
      max-height: 132px;
      padding-top: 8px;
      padding-bottom: 8px;
      font-size: 15px;
    }
  }
`;

const EndChatPrompt = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  padding: 12px;
  border-radius: 12px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  color: #614700;
  line-height: 1.5;

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }

  @media (max-width: 768px) {
    padding: 10px;
    font-size: 0.86rem;

    .actions {
      gap: 6px;
    }

    .actions .ant-btn {
      height: 36px;
      font-size: 0.84rem;
      border-radius: 10px;
    }
  }
`;

const ClosedCaseNotice = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 14px 16px 16px;
  padding: 14px;
  border-radius: 12px;
  background: #faf7f2;
  border: 1px solid #eadfce;
  color: #5d4a36;
  line-height: 1.5;

  @media (max-width: 768px) {
    margin: 12px 14px 14px;
    padding: 12px;
    font-size: 0.88rem;
  }

  .ant-btn {
    align-self: flex-start;
    min-width: 140px;
    height: 40px;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
  }
`;

const IconActionButton = styled(Button)`
  min-width: 42px;
  width: 42px;
  height: 42px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;

  &[data-emoji-trigger="true"] {
    font-size: 0;
  }

  &[data-emoji-trigger="true"]::before {
    content: "\\1F600";
    font-size: 1rem;
    line-height: 1;
  }

  .anticon {
    font-size: 1rem;
  }

  @media (max-width: 768px) {
    min-width: 36px;
    width: 36px;
    height: 36px;
    border-radius: 10px;

    &[data-emoji-trigger="true"]::before {
      font-size: 0.92rem;
    }

    .anticon {
      font-size: 0.92rem;
    }
  }
`;

const EmojiPickerWrapper = styled.div`
  position: absolute;
  bottom: 56px;
  right: 0;
  z-index: 9999;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.22);
  overflow: hidden;

  @media (max-width: 768px) {
    bottom: 46px;
    right: 0;
    width: min(300px, calc(100vw - 36px));
  }
`;

const ProductInputWrapper = styled.div`
  position: relative;
`;

const SuggestionsList = styled.ul`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 180px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
  z-index: 9999;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.14);
`;

const SuggestionItem = styled.li`
  padding: 10px 12px;
  cursor: pointer;
  line-height: 1.45;

  &:hover {
    background-color: #eee;
  }
`;

const OfflineNotice = styled.div`
  margin: 16px 16px 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff8e1;
  border: 1px solid #ffe08a;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.45;

  @media (max-width: 768px) {
    margin: 14px 14px 0;
    font-size: 0.78rem;
  }
`;
