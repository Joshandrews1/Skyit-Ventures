import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";
import { mockProducts } from "./src/data/products";
import { SOLAR_PACKAGES, calculateHeuristicFallback, APPLIANCES, hasHeavyLoad } from "./src/data/quote-data";
import { Order, OrderStatus, TrackingMilestone } from "./src/types";
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import https from 'https';

// Helper to safely load dotenv
import dotenv from "dotenv";
import { parse } from "path";
dotenv.config();

const app = express();

// Initialize server-side firebase instance for proxying Firestore queries
let serverDb: any = null;
let serverProductsCache: any[] | null = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const serverApp = initializeApp(firebaseConfig, 'server-app');
    serverDb = initializeFirestore(serverApp, {}, firebaseConfig.firestoreDatabaseId);
    console.log("[SERVER_FIREBASE] Server-side Firestore initialized successfully.");
  } else {
    console.warn("[SERVER_FIREBASE] firebase-applet-config.json not found, using static mockProducts.");
  }
} catch (e) {
  console.error("[SERVER_FIREBASE] Failed to initialize server-side Firebase:", e);
}

// Proxy /__/auth/* to Firebase's default Auth Domain to make custom-domain authentication work.
// Placed BEFORE body parsers to safely forward raw request bodies.
app.all('/__/auth/*', (req, res) => {
  const targetHost = 'gen-lang-client-0122140096.firebaseapp.com';
  const targetPath = req.originalUrl;

  const forwardHeaders: Record<string, any> = {};
  const excludedHeaders = new Set([
    'host',
    'connection',
    'keep-alive',
    'accept-encoding'
  ]);

  Object.entries(req.headers).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (value !== undefined && !excludedHeaders.has(lowerKey)) {
      forwardHeaders[key] = value;
    }
  });
  
  // Set host header so Google/Firebase recognizes the request
  forwardHeaders['host'] = targetHost;

  const proxyReq = https.request({
    hostname: targetHost,
    port: 443,
    path: targetPath,
    method: req.method,
    headers: forwardHeaders
  }, (proxyRes) => {
    res.status(proxyRes.statusCode || 500);
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
      if (value !== undefined) {
        res.setHeader(key, value);
      }
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[Firebase Auth Proxy Error]:', err);
    res.status(500).send(`Authentication proxy failed: ${err.message}\nStack: ${err.stack || ''}`);
  });

  // Pipe client request body (if any) directly to target server for write methods, otherwise end it immediately
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = Number(process.env.PORT || 3000);

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("GEMINI_API_KEY not configured. AI features will fallback gracefully to Safety Heuristics.");
}

// Helper to execute generateContent with dynamic retries sticking exclusively to gemini-3.1-flash-lite
async function generateContentWithFallback(aiInstance: GoogleGenAI | null, params: any): Promise<any> {
  if (!aiInstance) throw new Error("AI engine not configured.");
  const targetModel = "gemini-3.1-flash-lite";

  const requestParams = {
    ...params,
    model: targetModel
  };

  try {
    console.log(`[Gemini Request] Dispatching query to model: ${targetModel}...`);
    return await aiInstance.models.generateContent(requestParams);
  } catch (err: any) {
    console.warn(`[Gemini Warning] Model ${targetModel} failure:`, err?.message || err);
    console.log(`[Gemini Retry] Safe retry initiated for same model...`);
    
    // Quick delay before retrying
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      return await aiInstance.models.generateContent(requestParams);
    } catch (retryErr: any) {
      console.error(`[Gemini Error] Retry on ${targetModel} failed:`, retryErr?.message || retryErr);
      throw retryErr;
    }
  }
}

// In-memory active order maps
const activeOrders = new Map<string, Order>();

// Generate tailored SkyIT engineering & logistics milestones for solar and security installations
function createSkyITMilestones(createdAtStr: string): TrackingMilestone[] {
  const baseTime = new Date(createdAtStr);
  
  const addMinutes = (date: Date, minutes: number) => {
    return new Date(date.getTime() + minutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return [
    {
      status: 'pending',
      label: 'Order Approved',
      timestamp: baseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      completed: true,
      desc: "Solar/Security order approved. SkyIT site layouts and drawings catalog assignment initiated."
    },
    {
      status: 'confirmed',
      label: 'Engineering Audit Passed',
      timestamp: addMinutes(baseTime, 1.5),
      completed: true,
      desc: "Technical loads audit verified. Power inverter ratios and cable layout requirements locked."
    },
    {
      status: 'processing',
      label: 'Lab Pre-commissioning',
      timestamp: addMinutes(baseTime, 3.5),
      completed: false,
      desc: "Inverters customized and pre-configured. Battery banks balanced at SkyIT Lagos Tech lab."
    },
    {
      status: 'shipped',
      label: 'Dispatched to Site',
      timestamp: addMinutes(baseTime, 6.0),
      completed: false,
      desc: "Cabling, mounting iron, heavy panels, and battery packs en route via SkyIT Delivery."
    },
    {
      status: 'out_for_delivery',
      label: 'Engineering Team Deploying',
      timestamp: addMinutes(baseTime, 9.0),
      completed: false,
      desc: "Technical field crew is on-site. Securing solar panel rails, wiring conduits, and NVR settings."
    },
    {
      status: 'delivered',
      label: 'System Handover Live',
      timestamp: addMinutes(baseTime, 12.0),
      completed: false,
      desc: "Verification checklist completed. Net-metering setup online and system handed over to client!"
    }
  ];
}

// ————————————————————————————————————————————————————————————————
// AUTOMATED SMTP MAIL SYSTEM
// ————————————————————————————————————————————————————————————————

interface EmailInquiryInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

interface OrderMailingInput {
  orderId: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  total: number;
  paymentMethod: string;
  items?: any[];
}

async function processEmailInquiry(data: EmailInquiryInput) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const adminRecipient = process.env.NOTIFICATION_EMAIL_RECIPIENT || "skyitventures01@gmail.com";

  if (!user || !pass) {
    console.warn("[MAIL_WARN] GMAIL_USER or GMAIL_APP_PASSWORD credentials absent. Inquiry registered offline in server logs.");
    return { success: false, error: "SMTP credentials not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const adminMailOptions = {
      from: `"SkyIT Inquiry Service" <${user}>`,
      to: adminRecipient,
      replyTo: data.email,
      subject: `🚨 New Customer Inquiry: ${data.subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-top: 0;">New Portal Inquiry</h2>
          <p style="color: #475569; font-size: 15px;">A user has submitted an inquiry. Details are listed below:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Customer Name</td>
              <td style="padding: 10px 0; font-weight: bold; color: #0f172a;">${data.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Email Address</td>
              <td style="padding: 10px 0; color: #0284c7; font-weight: bold;">${data.email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Phone Connection</td>
              <td style="padding: 10px 0; color: #0f172a; font-family: monospace;">${data.phone || "Not specified"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Topic / Subject</td>
              <td style="padding: 10px 0; font-weight: bold; color: #334155;">${data.subject}</td>
            </tr>
          </table>

          <div style="margin-top: 20px; padding: 15px 20px; background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #4f46e5; font-size: 12px; text-transform: uppercase;">Message Content</p>
            <p style="white-space: pre-wrap; margin: 0; color: #334155; line-height: 1.5; font-size: 14px;">${data.message}</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="mailto:${data.email}?subject=RE: ${encodeURIComponent(data.subject)}" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">
              Reply Instantly
            </a>
          </div>
        </div>
      `,
    };

    const autoReplyMailOptions = {
      from: `"SkyIT Ventures Support" <${user}>`,
      to: data.email,
      subject: `Received Your Inquiry regarding: ${data.subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">✉️</span>
          </div>
          <h2 style="color: #0f172a; text-align: center; margin-top: 0;">We've Received Your Message!</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">
            Hi <strong>${data.name}</strong>,<br/>
            Thank you for reaching out! Our dedicated engineering team has successfully received your message regarding <strong>"${data.subject}"</strong>.
          </p>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
            <p style="color: #166534; font-weight: 500; font-size: 14px; margin: 0;">
              ✨ <strong>Auto-Responder:</strong> A technical supervisor will review your request and get back to you within 2 to 24 business hours.
            </p>
          </div>

          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
            <p style="margin: 0 0 5px 0;">This is an automated response to confirm receipt of your message.</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} SkyIT Ventures. All Rights Reserved.</p>
          </div>
        </div>
      `,
    };

    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(autoReplyMailOptions)
    ]);

    return { success: true };
  } catch (err: any) {
    console.error("[MAIL_ERROR] Inquiry dispatch failed:", err);
    return { success: false, error: err.message };
  }
}

async function processOrderMailing(orderData: OrderMailingInput) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const adminRecipient = process.env.NOTIFICATION_EMAIL_RECIPIENT || "skyitventures01@gmail.com";

  if (!user || !pass) {
    console.warn("[MAIL_WARN] GMAIL_USER or GMAIL_APP_PASSWORD credentials absent. Order processed offline securely.");
    return { success: false, error: "SMTP credentials not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const teamMailOptions = {
      from: `"SkyIT Orders Portal" <${user}>`,
      to: adminRecipient,
      subject: `🚨 [New paid Order]: REF-${orderData.orderId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #ef4444; padding-bottom: 10px; margin-top: 0;">New Sales Invoice Dispatch</h2>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 15px;">Transaction Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Order Reference:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${orderData.orderId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Customer Name:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${orderData.customerName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Phone:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${orderData.phone}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Invoice Total:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #0f172a; font-size: 16px;">₦${orderData.total.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Processor:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #2563eb; text-transform: uppercase;">${orderData.paymentMethod}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 20px;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Purchased Items</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left;">
                  <th style="padding: 8px; color: #475569;">Item Name</th>
                  <th style="padding: 8px; color: #475569; text-align: center;">Qty</th>
                  <th style="padding: 8px; color: #475569; text-align: right;">Unit Price</th>
                  <th style="padding: 8px; color: #475569; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderData.items && orderData.items.length > 0 ? orderData.items.map(item => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 8px; color: #0f172a; font-weight: 500;">${item.product?.name || item.name}</td>
                    <td style="padding: 10px 8px; color: #475569; text-align: center;">${item.quantity}</td>
                    <td style="padding: 10px 8px; color: #475569; text-align: right;">₦${(item.product?.price || item.price || 0).toLocaleString()}</td>
                    <td style="padding: 10px 8px; color: #0f172a; text-align: right; font-weight: bold;">₦${((item.product?.price || item.price || 0) * item.quantity).toLocaleString()}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="4" style="padding: 10px 8px; text-align: center; color: #64748b;">No direct product breakdown supplied. Refer to order ID in workspace.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      `,
    };

    const customerMailOptions = {
      from: `"SkyIT Smart Orders" <${user}>`,
      to: orderData.customerEmail,
      subject: `Receipt for your order: REF-${orderData.orderId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px;">
            <span style="font-size: 32px;">🎉</span>
            <h2 style="color: #0f172a; margin: 10px 0 5px 0;">Purchase Confirmed!</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Order Reference: ${orderData.orderId}</p>
          </div>

          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Hi <strong>${orderData.customerName}</strong>,
          </p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-top: 0;">
            We are thrilled to inform you that your purchase was completed successfully. We are already arranging logistics to dispatch your parcel.
          </p>

          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              Payment Receipt
            </h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Subtotal Charge</td>
                <td style="padding: 6px 0; text-align: right; color: #334155; font-weight: 500;">₦${orderData.total.toLocaleString()}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 0; color: #64748b;">Delivery Fee</td>
                <td style="padding: 6px 0; text-align: right; color: #16a34a; font-weight: bold;">FREE/INCLUDED</td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0 0; color: #0f172a; font-weight: bold; font-size: 16px;">Total Paid</td>
                <td style="padding: 12px 0 0 0; text-align: right; color: #0f172a; font-weight: bold; font-size: 18px;">₦${orderData.total.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            If you have any questions, simply reply directly to this email. Our support team is here to help!
          </p>

          <div style="text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0 0 4px 0;">Thank you for shopping with us!</p>
            <p style="margin: 0;">This email is confirmation of payment for your order.</p>
          </div>
        </div>
      `,
    };

    await Promise.all([
      transporter.sendMail(teamMailOptions),
      transporter.sendMail(customerMailOptions)
    ]);
    return { success: true };
  } catch (err: any) {
    console.error("[MAIL_ERROR] Could not ship order notifications:", err);
    return { success: false, error: err.message };
  }
}

// API: Get products
app.get("/api/products", async (req, res) => {
  try {
    if (!serverDb) {
      return res.json(serverProductsCache || mockProducts);
    }
    const productsColRef = collection(serverDb, 'products');
    const snapshot = await getDocs(productsColRef);
    const firestoreProducts: any[] = [];
    snapshot.forEach((docSnap) => {
      firestoreProducts.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    
    // Merge with mockProducts to ensure all baseline products are present
    const merged = [...firestoreProducts];
    mockProducts.forEach((staticProd) => {
      if (!merged.some(p => p.id === staticProd.id)) {
        merged.push(staticProd);
      }
    });
    
    // Update the server-side cache
    serverProductsCache = merged;
    
    res.json(merged);
  } catch (error) {
    console.error("[SERVER_PRODUCTS_ERROR] Failed to fetch products from Firestore server-side:", error);
    if (serverProductsCache) {
      console.log("[SERVER_PRODUCTS_INFO] Serving products from in-memory cache fallback.");
      res.json(serverProductsCache);
    } else {
      res.json(mockProducts);
    }
  }
});

// API: AI Product Sizing and Generation Suggestion Agent
app.post("/api/admin/suggest-product", async (req, res) => {
  const { draftPrompt } = req.body;

  if (!draftPrompt || !draftPrompt.trim()) {
    return res.status(400).json({ error: "Please enter some specifications or product tags." });
  }

  const prompt = `You are a high-fidelity West African solar and security system e-commerce product curation helper.
Given this conversational draft of a product or its tags, generate a fully structured Product item:
Draft: "${draftPrompt}"

Guidelines:
1. Category must be exactly one of: "Solar Panels", "Inverters", "Batteries", "Security Systems", "Smart Home"
2. originalPrice is the baseline price before any discounts. If draft specifies a price, use it as candidate originalPrice (convert to standard Naira or $ equivalent value if needed).
3. If discountPercent is specified in draft (e.g. 10% or 20%), set it as a number (e.g. 10 or 20). If not, default to 0.
4. price must be exactly calculated as: Math.round(originalPrice * (1 - discountPercent / 100))
5. Features should be an array of 4-5 high-fidelity compelling bullet points.
6. Specs should be an object (Record<string, string>) representing 4-6 detailed technical rows.
7. stock should be a reasonable number (between 5 and 150) if not specified.
8. Do NOT fill or recommend any item images or secondary image URLs. Keep the image string empty and the images array empty.
9. Write a professional, detailed product description showing great value.`;

  try {
    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.1-flash-lite",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Display name of product" },
            description: { type: Type.STRING, description: "Detailed description of product benefits" },
            category: { type: Type.STRING, description: "Category of product" },
            originalPrice: { type: Type.NUMBER, description: "Price before discount" },
            discountPercent: { type: Type.NUMBER, description: "Percent discount" },
            price: { type: Type.NUMBER, description: "Final price after discount" },
            features: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4-5 selling features" },
            specs: { type: Type.OBJECT, description: "Key technical specification values" },
            stock: { type: Type.NUMBER, description: "Suggested default stock amount" },
            image: { type: Type.STRING, description: "Must be an empty string value: ''" },
            images: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Must be an empty list: []" }
          },
          required: ["name", "description", "category", "originalPrice", "discountPercent", "price", "features", "specs", "stock", "image", "images"]
        }
      }
    });

    const bodyText = response?.text?.trim() || "{}";
    const parsedData = JSON.parse(bodyText);
    res.json(parsedData);
  } catch (err: any) {
    console.error("[SUGGEST_PRODUCT_ERROR]", err);
    res.status(500).json({ error: err?.message || "Failed to generate AI product metadata suggestion." });
  }
});

// API: Contact Submission with Automated Multi-Recipient SMTP Notifications
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required fields." });
  }

  const result = await processEmailInquiry({ name, email, phone, subject, message });
  res.json({ success: true, mailResult: result });
});

// API: Checkout Order Simulation
app.post("/api/checkout", (req, res) => {
  const { items, subtotal, deliveryFee, discount, total, customerDetails, paymentMethod, userId } = req.body;

  if (!items || items.length === 0 || !customerDetails) {
    return res.status(400).json({ error: "Invalid layout for checkout." });
  }

  const orderId = "SK-" + Math.floor(100000 + Math.random() * 900000);
  const now = new Date().toISOString();

  const newOrder: Order = {
    id: orderId,
    userId,
    items,
    subtotal,
    deliveryFee,
    discount,
    total,
    customerDetails,
    status: 'confirmed',
    trackingProgress: createSkyITMilestones(now),
    createdAt: now,
    paymentMethod: paymentMethod || "SkyIT Secure Portal Transfer"
  };

  activeOrders.set(orderId, newOrder);

  // Background dispatch SMTP confirmation emails securely to both admin & customer
  processOrderMailing({
    orderId: newOrder.id,
    customerName: customerDetails.name,
    customerEmail: customerDetails.email,
    phone: customerDetails.phone || "Not specified",
    total: total,
    paymentMethod: newOrder.paymentMethod,
    items: newOrder.items
  }).catch(err => {
    console.warn("[MAIL_WARN] Background order invoice transmission failed:", err);
  });

  res.json({ success: true, order: newOrder });
});

// API: Order Tracking Details
app.get("/api/track/:orderId", (req, res) => {
  const { orderId } = req.params;
  const order = activeOrders.get(orderId);

  if (!order) {
    return res.status(404).json({ error: "Order details not found. Enter valid ID." });
  }

  res.json(order);
});

// API: Solar Sizing & Custom Sizing Recommendation Engine
app.post("/api/solar-quote", async (req, res) => {
  const { 
    fullName, 
    buildingType, 
    city, 
    state, 
    requiresAC, 
    requiresHeavy, 
    techPreference, 
    applianceList,
    selectedAppliances 
  } = req.body;

  // Compile active catalog subset
  const catalog = SOLAR_PACKAGES[techPreference as 'tubular' | 'lithium'] || SOLAR_PACKAGES.tubular;

  // Let's check for fallback first if Gemini key isn't configured
  if (!ai) {
    console.log("No Gemini API key. Running offline Safety Heuristic sizing...");
    const recommendedId = calculateHeuristicFallback(selectedAppliances || {}, null, techPreference, catalog);
    const matched = catalog.find(p => p.id === recommendedId);

    return res.json({
      recommendedPackageId: recommendedId,
      analysis: `### Hello ${fullName || "Valued Client"},
This recommendation is sized using our built-in SkyIT Engineering Safety Heuristic due to offline status.

Based on your selection of appliances, we identified key power requirements for your **${buildingType || "Residential Site"}** in **${city || "Lagos"}, ${state || "Nigeria"}**.
- **Inductive surge classification**: ${requiresHeavy ? "Heavy Startup Inductive Load Detected (Requires robust surge headroom)" : "Basic load layout"}
- **Selected Energy Storage Tech**: **${techPreference === 'lithium' ? "Premium LiFePO4 Lithium" : "Deep-Cycle Tall Tubular"}**

We recommend deploying the **${matched?.name || "Appropriate SkyIT Kit"}** with a potential surge capacity of **${matched?.kva || "3.5KVA"}**. This guarantees continuous operational thresholds without system trips.`,
      estimatedPeakLoad: requiresHeavy ? "2,500W to 4,500W (Surge peak)" : "800W to 1,500W (Steady state)",
      loadBreakdown: [
        "Primary Basic Load: LED illumination, Television, and charging",
        requiresAC ? "Cooling: High-Efficiency DC Inverter Air Conditioning support matched" : "Cooling: Direct ceiling fans recommended with minimal surge footprint",
        requiresHeavy ? "Power Utility: Pumping Machine / Electric pressing iron isolated to active sun hours" : "Utility: Basic steady devices only"
      ],
      isAcCompatible: !requiresAC || (matched ? matched.acSupport !== "No AC Support" : false)
    });
  }

  try {
    const prompt = `You are a Senior Solar Systems Engineer at SkyIT Ventures. Your job is to analyze a client's energy needs and recommend the most suitable Solar Package from our catalog.

CLIENT PROFILE:
- Name: ${fullName}
- Site Type: ${buildingType}
- Location: ${city}, ${state}
- AC Required: ${requiresAC ? "YES" : "NO"}
- Heavy Load (Pump/Microwave/Washer) Required: ${requiresHeavy ? "YES" : "NO"}
- Battery Preference: ${techPreference}

APPLIANCE LIST:
${applianceList}

CURRENT CATALOG:
${catalog.map(p => `- ${p.name} (ID: ${p.id}, KVA: ${p.kva}, Tech: ${p.tech}, Price: ₦${p.price}, AC Support: ${p.acSupport})`).join('\n')}

TASK:
1. Parse the appliance list and estimate the peak load and daily energy consumption.
2. Filter the catalog by the client's battery preference (${techPreference}).
3. Identify the best package that handles the estimated load and meets technical requirements. 
   - If AC Required or Heavy Load is true, select packages where KVA is 5.0 or higher.
   - If AC Required is true, only suggest packages where AC Support is NOT "No AC Support".
4. Generate a professional technical justification addressing ${fullName}. Explain the balance of surge capacity, solar harvest, and battery charging autonomy. Use high-quality markdown in your analysis statement.
5. If no package fits perfectly, suggest the closest upgrade.

REPLY FORMAT:
Return a valid JSON object matching the defined schema.`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.1-flash-lite",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedPackageId: { type: Type.STRING },
            analysis: { type: Type.STRING },
            estimatedPeakLoad: { type: Type.STRING },
            loadBreakdown: { type: Type.ARRAY, items: { type: Type.STRING } },
            isAcCompatible: { type: Type.BOOLEAN },
          },
          required: ["analysis", "estimatedPeakLoad", "loadBreakdown", "isAcCompatible"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Model failed to generate a valid recommendation.");
    res.json(JSON.parse(text));
  } catch (err: any) {
    console.error("Gemini Sizing Engine Failure, employing fallback heuristic:", err);
    // instant backup recovery sizing
    const recommendedId = calculateHeuristicFallback(selectedAppliances || {}, null, techPreference, catalog);
    const matched = catalog.find(p => p.id === recommendedId);

    res.json({
      recommendedPackageId: recommendedId,
      analysis: `### Hello ${fullName || "Customer"},
We successfully sized your system using our **SkyIT Engineering Sizing Heuristics** (System fell back to heuristic parameters due to a temporary AI rate-limit).

We evaluated your power configuration profile for your home/office in **${city || "Lagos"}, ${state || "Nigeria"}**:
- Battery Storage Technology: **${techPreference === 'lithium' ? "LiFePO4 Lithium-Iron PowerWall" : "Tall Tubular 220AH"}**
- Peak Load Analysis:Sufficient to run your required appliances when matched with our robust **${matched?.name || "Standard Kit"}** panel kit.
- Recommendations: Keep heavy surge heaters and pumping machines limited to sunny periods.`,
      estimatedPeakLoad: requiresHeavy ? "3,000W - 5,000W Surge Rating" : "1,200W Steady Rating",
      loadBreakdown: [
        "Base circuit loads including refrigerator and media feeds",
        requiresHeavy ? "Power startup device triggers modeled" : "Basic consumer electronics"
      ],
      isAcCompatible: !requiresAC || (matched ? matched.acSupport !== "No AC Support" : false)
    });
  }
});

// API: SkyIT Gemini Advisor Chat Assistant
app.post("/api/chat", async (req, res) => {
  const { message, history, summary, userName } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message query is required." });
  }

  const isGuest = !userName || userName === "Guest" || userName === "Customer";
  const userDisplayName = isGuest ? "Customer" : userName;

  // If Gemini key is missing, provide a friendly rich technical fallback
  if (!ai) {
    return res.json({
      reply: `${isGuest ? "Hello" : `Hello, ${userDisplayName}`}! I am your **SkyIT Ventures Energy Specialist**. 😊

I am currently running in local offline safety backup mode. Based on our catalog, I can guide you on:
1. **Solar Power Systems**: Monocrystalline plates (e.g. 550W Panel), Smart Pure Sine Inverters, and High-Performance Wall-mount Lithium-ion Batteries (PowerWall 5KWH).
2. **CCTV & Security Solutions**: 4K Ultra-HD CCTV kits, dome security arrays, and Smart Biometric doors locks.

Tell me about your building (flat, commercial site, etc.) or check out our **Smart Solar Sizing Quote Utility** from the navigator menu! It performs full electrical audits for you.`,
      recommendedProductIds: ["prod-1", "prod-5", "prod-6"],
      summary: summary || ""
    });
  }

  try {
    const activeProductsList = (req.body.products && Array.isArray(req.body.products)) ? req.body.products : mockProducts;
    const catalogBrief = activeProductsList.map((p: any) => {
      return `ID: ${p.id}, Name: ${p.name}, Category: ${p.category}, Price: ₦${p.price} (Original: ₦${p.originalPrice}), Rating: ${p.rating}, Description: ${p.description}`;
    }).join("\n");

    const systemPrompt = `You are a Senior Technical Consultant and Solar Architect representing SkyIT Ventures. 
    ${isGuest ? 'The current user is a Guest (not logged in). Do NOT attempt to name them or say "Guest" or "Customer" as a greeting name. Greet them neutrally (e.g., "Hello!", "Welcome!").' : `The customer you are conversing with is named ${userDisplayName}. Address them naturally by their first name when greeting them or in conversation.`}
    Your mission is to provide premium technical advice, evaluate customer electrical/security setups, and recommend matching items from our exact product catalog when appropriate:
    ${catalogBrief}

    CRITICAL RULES:
    1. DIAGNOSE BEFORE SUGGESTING: Do NOT immediately pitch products, list suggestions, or send long detailed catalog options when the customer first greets you or has not shared their specific needs. You must first find out why the customer is here. Ask 1 or 2 friendly, high-value questions (e.g. asking about their building type, power requirements, or security concerns) to understand their specific context first.
    2. REPRESENT WITHOUT LOCATION: Represent our company, SkyIT Ventures, objectively and professionally. Do not explicitly state that you are physically located in "Lagos, Nigeria" or any specific city in your replies, but just represent our brand.
    3. Ground pricing in Nigerian Naira (₦) when products are recommended.
    4. When recommending products, suggest items STRICTLY by their exact string ID keys from the catalog above.
    5. Keep your tone supportive, highly technical, yet clean and conversational.
    
    You must respond strictly in JSON format matching this schema:
    {
      "reply": "Conversational markdown text explaining your suggestions or asking diagnostic questions.",
      "recommendedProductIds": ["list", "of", "ids", "matching", "the", "items", "mentioned"]
    }
    Format your reply with neat markdown, bold emphasis, and direct helpful tips. Do not include external links.`;

    let currentSummary = summary || "";

    // Sliding window summary-based optimization for extreme token-saving cost-reduction.
    // If history length is 4 or more, we summarize older parts.
    if (history && Array.isArray(history) && history.length >= 4) {
      // Summarize if we don't have a summary, or periodically to keep memory fresh (e.g. historical length increments of 4)
      if (!currentSummary || history.length % 4 === 0) {
        const messagesToSummarize = history.slice(0, history.length - 2);
        const textToSummarize = messagesToSummarize
          .map((m: any) => `${m.sender === "user" ? "Customer" : "Consultant"}: ${m.text}`)
          .join("\n");

        try {
          console.log("[Gemini AI] Summarizing older conversation history to conserve token space...");
          const summaryResponse = await generateContentWithFallback(ai, {
            model: "gemini-3.1-flash-lite",
            contents: `Summarize the following customer conservation history in 1-2 concise, highly dense sentences. Highlight critical user requirements, specified appliances (like ACs, freezers), building specs, budget constraints, or selected catalog parts:\n\n${textToSummarize}`
          });
          if (summaryResponse && summaryResponse.text) {
            currentSummary = summaryResponse.text.trim();
          }
        } catch (sumErr) {
          console.warn("[Gemini AI] Summarization error, falling back or skipping:", sumErr);
        }
      }
    }

    // Prepare system instructions incorporating the sliding conversation summary
    let systemInstruction = systemPrompt;
    if (currentSummary) {
      systemInstruction += `\n\n[SUMMARY OF PRECEDING CHAT TURNS FOR CONTEXT UNIFICATION]:\n${currentSummary}\nAlign your technical sizing parameters and specs with this summarized background.`;
    }

    // Prepare contents array containing only the sliding window (recent items) plus the ongoing user query
    const contentsArray: any[] = [];
    const historyToUse = (history && Array.isArray(history) && history.length >= 4)
      ? history.slice(history.length - 2)
      : (history || []);

    for (const h of historyToUse) {
      contentsArray.push({
        role: h.sender === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      });
    }

    const userParts: any[] = [{ text: message }];
    if (req.body.images && Array.isArray(req.body.images)) {
      req.body.images.forEach((img: any) => {
        let cleanBase64 = img.base64;
        if (cleanBase64.includes(";base64,")) {
          cleanBase64 = cleanBase64.split(";base64,")[1];
        }
        userParts.push({
          inlineData: {
            mimeType: img.mimeType || "image/jpeg",
            data: cleanBase64
          }
        });
      });
    }

    contentsArray.push({
      role: "user",
      parts: userParts
    });

    const modelResponse = await generateContentWithFallback(ai, {
      model: "gemini-3.1-flash-lite",
      contents: contentsArray,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { 
              type: Type.STRING, 
              description: "The Markdown response reply message providing technical advice and specs description." 
            },
            recommendedProductIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Product IDs matching recommended catalog items only."
            }
          },
          required: ["reply", "recommendedProductIds"]
        }
      }
    });

    const replyValue = modelResponse.text;
    if (replyValue) {
      const parsed = JSON.parse(replyValue.trim());
      res.json({
        ...parsed,
        summary: currentSummary
      });
    } else {
      throw new Error("Empty response back from Gemini.");
    }
  } catch (err: any) {
    console.error("Gemini AI Consultant Error:", err);
    res.status(500).json({ 
      error: "AI connection delay.",
      reply: "Hello! I suffered a slight network delay, but I am here! Ask me anything about our hybrid inverters, Monocrystalline panels, or starlight dome camera packages. I highly recommend checking out our **5.0KWH Premium Lithium Powerwall** (₦1,850,000) or our **Smart 3.5KVA Pure Sine Wave Inverter** (₦480,000) for uncompromised power backup in Lagos!",
      recommendedProductIds: ["prod-2", "prod-5"],
      summary: summary || ""
    });
  }
});

// API: Admin AI Plain Text Quote Generator
app.post("/api/admin/generate-quote", async (req, res) => {
  const { plainText } = req.body;

  if (!plainText || !plainText.trim()) {
    return res.status(400).json({ error: "Plain text description is required." });
  }

  // Fallback structure in case AI is not configured or fails
  const fallbackQuote = {
    customerName: "Valued Client",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "Main Office Site",
    city: "Lagos",
    state: "Lagos State",
    systemKva: "3.5KVA",
    batteryTech: "tubular",
    batteryInfo: "2x 220AH Tubular Batteries",
    batteriesCount: 2,
    panelsCount: 6,
    panelsInfo: "6x 550W Mono-crystalline PV Panels",
    inverterInfo: "3.5KVA Pure Sine Wave Hybrid Inverter",
    accessories: ["4mm² solar cables", "AC/DC breakers", "Inverter mount rack", "Battery protection fuse"],
    appliancesMatched: ["Inverter Fridge", "Smart TV", "LED Bulbs", "Fans"],
    serviceFee: 150000,
    price: 1782000,
    proposalText: "Sized based on your general layout. SkyIT premium hybrid solar installation provides instant seamless power backup for critical office/home appliances."
  };

  if (!ai) {
    console.log("No Gemini API key. Returning template quote back to admin.");
    return res.json(fallbackQuote);
  }

  try {
    const prompt = `You are an AI Sales Configurator and Solar Sizing Estimator at SkyIT Ventures (Lagos, Nigeria).
Your task is to parse a client sales note or description written in plain text, extract customer profile details, determine physical system sizing and equipment details, and format it as a clean, structured quotation JSON.

PLAIN TEXT DESIGNATION NOTES from the lead engineer:
"""
${plainText}
"""

RULES:
1. Extract the Customer Name. If not mentioned in the plain text, use "Valued Client".
2. Extract Customer Location (City / State). If not mentioned, default to "Lagos", "Lagos State".
3. Extract Contact Details (Phone, Email, Address). If customerEmail or customerPhone is not explicitly provided in the notes, you MUST output empty strings ("") for those keys respectively. Do NOT invent placeholders or fake credentials for them.
4. From the description, determine the system KVA (like "3.5KVA", "5.0KVA", "10.0KVA", etc.). If not mentioned, estimate a suitable capacity based on specified appliances.
5. Identify battery tech preference: "tubular" or "lithium". Defaults to "tubular" if Lithium isn't specified.
6. Auto-generate key specs based on standard SkyIT standards:
   - 1.5KVA Tubular: 1 battery (220AH Tubular), 3 panels, ₦948,000 baseline.
   - 3.5KVA Tubular: 2 batteries (220AH Tubular) or 4 batteries (Extended), 6 panels, ₦1,782,000 - ₦2,702,000.
   - 5.0KVA Tubular: 2 or 4 batteries (220AH Tubular), 8 to 10 panels, ₦1,932,000 - ₦2,928,005.
   - 4.0KVA Lithium: 1 Battery (5KWH Lithium-ion), 6 panels, ₦2,700,000.
   - 6.0KVA Lithium: 2 Batteries (10KWH) or 3 Batteries (15KWH), 10 panels, ₦4,548,000 - ₦5,300,000.
   - 10.0KVA Lithium: 2 Batteries (10KWH) or 3 Batteries (15KWH), 12 panels, ₦5,650,000 - ₦6,150,000.
   If the plain text text mentions a custom pricing (e.g. "We agreed to ₦2,400,000 total"), use that explicit price instead of catalog price, or set the price precisely to what was mentioned! Keep the price as a pure integer.
7. Provide a detailed equipment layout based on what was described.
8. Formulate a personalized "proposalText" stating why this system has been formulated for them.

Please respond strictly in JSON format matching this schema:
{
  "customerName": "The extracted or inferred name of the client",
  "customerEmail": "Extracted email, or default placeholder",
  "customerPhone": "Extracted phone number, or default placeholder",
  "customerAddress": "Extracted address, or default placeholder",
  "city": "Extracted city",
  "state": "Extracted state",
  "systemKva": "Extracted system KVA capacity (e.g. '3.5KVA', '5.0KVA', '10.0KVA')",
  "batteryTech": "either 'tubular' or 'lithium'",
  "batteryInfo": "Brief descriptive label for the batteries (e.g. '2x 220AH Tall Tubular Batteries')",
  "batteriesCount": 2,
  "panelsCount": 6,
  "panelsInfo": "Descriptive label for solar panels (e.g. '6x 550W Tier-1 Mono-crystalline Panels')",
  "inverterInfo": "Descriptive label for the hybrid inverter (e.g. '5.0KVA Pure Sine Wave Solar Inverter')",
  "accessories": ["List of accessories like '4mm² cables', 'Battery protection switch', etc."],
  "appliancesMatched": ["List of appliances supported by this plan"],
  "serviceFee": 120000,
  "price": number (the final complete contract price in Nigerian Naira, as specified in the text or catalog estimate),
  "proposalText": "Personalized technical proposal text addressing the client by name and detailing solar harvest benefits."
}`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.1-flash-lite",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            customerEmail: { type: Type.STRING },
            customerPhone: { type: Type.STRING },
            customerAddress: { type: Type.STRING },
            city: { type: Type.STRING },
            state: { type: Type.STRING },
            systemKva: { type: Type.STRING },
            batteryTech: { type: Type.STRING },
            batteryInfo: { type: Type.STRING },
            batteriesCount: { type: Type.INTEGER },
            panelsCount: { type: Type.INTEGER },
            panelsInfo: { type: Type.STRING },
            inverterInfo: { type: Type.STRING },
            accessories: { type: Type.ARRAY, items: { type: Type.STRING } },
            appliancesMatched: { type: Type.ARRAY, items: { type: Type.STRING } },
            serviceFee: { type: Type.INTEGER },
            price: { type: Type.INTEGER },
            proposalText: { type: Type.STRING },
          },
          required: [
            "customerName", "customerEmail", "customerPhone", "customerAddress",
            "city", "state", "systemKva", "batteryTech", "batteryInfo", 
            "batteriesCount", "panelsCount", "panelsInfo", "inverterInfo",
            "accessories", "appliancesMatched", "serviceFee", "price", "proposalText"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No output text from Gemini.");
    }
    res.json(JSON.parse(text.trim()));
  } catch (err) {
    console.error("AI Admin Quote Generation failed, using heuristics:", err);
    res.json(fallbackQuote);
  }
});

// API: Notify Admin of Created/Saved Quotation via SMTP email
app.post("/api/admin/notify-quote", async (req, res) => {
  const { quote, orderId } = req.body;

  if (!quote) {
    return res.status(400).json({ error: "Quote payload is required" });
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const adminRecipient = process.env.NOTIFICATION_EMAIL_RECIPIENT || "skyitventures01@gmail.com";

  if (!user || !pass) {
    console.warn("[MAIL_WARN] GMAIL_USER or GMAIL_APP_PASSWORD credentials absent. Quote notification processed offline.");
    return res.json({ success: true, offline: true, message: "SMTP credentials not configured" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const adminMailOptions = {
      from: `"SkyIT Quote Guard" <${user}>`,
      to: adminRecipient,
      subject: `🚨 [Action Required - Verify Quote]: REF-${orderId || "CUSTOM"}`,
      html: `
        <div style="font-family: sans-serif; max-width: 650px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-top: 0;">New Quote Created & Saved</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">
            An administrative or custom solar quotation has been logged to the database. <strong>Please double-check the sizing specifications below</strong> to ensure hardware availability, electrical ratings, and overall pricing metrics are correct.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Client Profile</h3>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; color: #64748b; width: 130px;">Name:</td>
                <td style="padding: 5px 0; font-weight: bold; color: #0f172a;">${quote.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #64748b;">Email:</td>
                <td style="padding: 5px 0; font-weight: bold; color: #2563eb;">${quote.customerEmail || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #64748b;">Phone:</td>
                <td style="padding: 5px 0; font-weight: bold; color: #0f172a;">${quote.customerPhone || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #64748b;">Address:</td>
                <td style="padding: 5px 0; color: #334155;">${quote.customerAddress || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #64748b;">Location:</td>
                <td style="padding: 5px 0; color: #334155;">${quote.city}, ${quote.state}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0369a1; font-size: 15px; border-bottom: 1px solid #7dd3fc; padding-bottom: 6px;">Sizing & Hardware Specs</h3>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #0369a1; width: 130px; font-weight: 500;">Capacity:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${quote.systemKva}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #0369a1; font-weight: 500;">Inverter:</td>
                <td style="padding: 6px 0; color: #0f172a;">${quote.inverterInfo}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #0369a1; font-weight: 500;">Batteries:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${quote.batteriesCount}x (${quote.batteryTech === "lithium" ? "Lithium" : "Tubular"}) - ${quote.batteryInfo}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #0369a1; font-weight: 500;">Solar Panels:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${quote.panelsCount}x panels - ${quote.panelsInfo}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #0369a1; font-weight: 500;">Accessories:</td>
                <td style="padding: 6px 0; color: #475569; font-size: 12px;">${quote.accessories && quote.accessories.length > 0 ? quote.accessories.join(', ') : "None"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #0369a1; font-weight: 500;">Appliances Matched:</td>
                <td style="padding: 6px 0; color: #475569; font-size: 12px;">${quote.appliancesMatched && quote.appliancesMatched.length > 0 ? quote.appliancesMatched.join(', ') : "None"}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #991b1b; font-size: 15px; border-bottom: 1px solid #fca5a5; padding-bottom: 6px;">Pricing Breakdown</h3>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; color: #991b1b; width: 130px;">Installation Fee:</td>
                <td style="padding: 5px 0; font-family: monospace; color: #334155;">₦${quote.serviceFee.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #991b1b; font-weight: bold; font-size: 15px;">Total Contract Price:</td>
                <td style="padding: 5px 0; font-family: monospace; font-weight: bold; color: #991b1b; font-size: 16px;">₦${quote.price.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="border-left: 4px solid #3b82f6; padding: 12px; background-color: #f8fafc; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0 0 6px 0; font-weight: bold; color: #1d4ed8; font-size: 12px; text-transform: uppercase;">Technical Sizing Recommendation</p>
            <p style="margin: 0; color: #334155; font-size: 13px; line-height: 1.5;">${quote.proposalText}</p>
          </div>

          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            This is an automated administrative notification dispatched securely from the SkyIT Ventures Engineering Board.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(adminMailOptions);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[MAIL_ERROR] Quote admin notification failed:", err);
    return res.status(500).json({ error: err.message });
  }
});

// API: Initiate Flutterwave payment standard server redirect using Flutterwave v3
app.post("/api/flutterwave/initiate", async (req, res) => {
  try {
    const { amount, email, phone, name, orderId, origin } = req.body;
    
    const v3SecretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!v3SecretKey || v3SecretKey.trim() === "") {
      return res.status(400).json({ 
        success: false, 
        error: "Flutterwave v3 Secret Key is not configured. Please set FLUTTERWAVE_SECRET_KEY." 
      });
    }

    console.log("[Flutterwave v3] Initiating secure checkout for amount:", amount);

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${v3SecretKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tx_ref: orderId,
        amount: parseFloat(amount),
        currency: "NGN",
        redirect_url: `${origin}/`,
        customer: {
          email: email,
          phonenumber: phone || "+2348000000000",
          name: name || "Customer"
        },
        customizations: {
          title: "SkyIT Solar & Security Store",
          description: "Acquiring premium energy & security hardware solutions.",
          logo: "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae"
        }
      })
    });

    const result = await response.json();

    if (response.ok && result.status === "success" && result.data?.link) {
      return res.json({ success: true, url: result.data.link });
    } else {
      console.error("[Flutterwave v3 Rejection]", result);
      return res.status(400).json({ 
        success: false, 
        error: result.message || "v3 failed to generate payment link." 
      });
    }

  } catch (error: any) {
    console.error("[FLW_INIT_ERROR]", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Verify Flutterwave payment status securely on the backend using Flutterwave v3
app.get("/api/flutterwave/verify", async (req, res) => {
  try {
    const { status, tx_ref, transaction_id } = req.query;

    const v3SecretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!v3SecretKey || v3SecretKey.trim() === "") {
      return res.status(400).json({ 
        success: false, 
        error: "Flutterwave v3 Secret Key is not configured for verification." 
      });
    }

    if (!transaction_id) {
      return res.status(400).json({ 
        success: false, 
        error: "No transaction_id parameter provided for verification." 
      });
    }

    console.log("[Flutterwave v3] Verifying transaction:", transaction_id);
    const verifyResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${v3SecretKey.trim()}`
      }
    });
    
    const verificationData = await verifyResponse.json();

    if (verifyResponse.ok && verificationData.status === "success" && (verificationData.data.status === "successful" || verificationData.data.status === "completed")) {
      console.log(`[v3] Verified successfully for reference: ${tx_ref}`);
      return res.json({ success: true, method: 'v3' });
    } else {
      console.error("[v3 Verification Failure]", verificationData);
      return res.status(400).json({ 
        success: false, 
        error: `v3 Verification failed. Status: ${verificationData?.data?.status || verificationData?.status}` 
      });
    }
  } catch (error: any) {
    console.error("[VERIFICATION_SYSTEM_ERROR]", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai-search
// Processes an uploaded image against a catalog of items using Gemini-3.5-flash
app.post("/api/ai-search", async (req, res) => {
  const { image, products } = req.body;

  if (!image) {
    return res.status(400).json({ error: "An image data URL or base64 string is required." });
  }

  if (!ai) {
    return res.status(503).json({ error: "AI visual search engine is offline. Please configure GEMINI_API_KEY." });
  }

  try {
    // 1. Format catalog list into a scannable text representation for the model
    const catalogBrief = (products || []).map((p: any) => {
      return `- ID: ${p.id || p._id}, Name: ${p.name}, Category: ${p.category}, Description: ${p.description || "No description."}`;
    }).join("\n");

    // 2. Decode Data URL/Base64 Image
    let base64Data = image;
    let mimeType = "image/jpeg";
    if (image.startsWith("data:")) {
      const parts = image.split(",");
      base64Data = parts[1];
      const mimeMatch = parts[0].match(/data:(.*?);/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    // 3. Craft strict comparison instructions
    const textPart = {
      text: `Analyze the uploaded image and identify if it contains a product related to our catalog.
      
      Compare the visual details of the item in the image with our available product catalog below and determine if we have a matching or closely related product.
      
      Available catalog products:
      ${catalogBrief || "No products in the catalog yet."}

      Output your analysis strictly in JSON format as specified by the response schema. 
      - If there is a matching product in our catalog, identify it and explain why it is a match. 
      - If it is a related product category but not an exact item we sell, set "matchFound" to true, "matchedProductId" to the closest matching item in that category, and write an explanation explaining how it is related and suggesting our product. 
      - If the image does not show any related system product, set "matchFound" to false and "matchedProductId" to null.`,
    };

    console.log("[AI Search] Dispatching image analysis to gemini-3.5-flash...");
    
    // 4. Request Structured JSON Output from Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchFound: { type: Type.BOOLEAN },
            matchedProductId: { 
              type: Type.STRING,
              description: "The ID of the closest matching product in our catalog, or null if absolutely no match or category match is found."
            },
            confidence: { 
              type: Type.NUMBER,
              description: "Confidence rating of the match between 0.0 and 1.0."
            },
            explanation: { 
              type: Type.STRING,
              description: "A friendly, descriptive sentence identifying what is seen in the picture and why/how it relates to our recommended product."
            }
          },
          required: ["matchFound", "explanation"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response text returned from Gemini API.");
    }

    const result = JSON.parse(resultText.trim());
    res.json(result);

  } catch (error: any) {
    console.error("[AI Search Error]:", error);
    res.status(500).json({ error: error.message || "An error occurred during AI visual search analysis." });
  }
});

// Alias Endpoints to follow reference integration specs
app.post('/api/initialize-payment', (req, res) => {
  // Redirect to initiate handler to reuse setup
  req.url = '/api/flutterwave/initiate';
  (app as any).handle(req, res);
});

app.get('/payment-callback', (req, res) => {
  req.url = '/api/flutterwave/verify';
  (app as any).handle(req, res);
});

// Configure Vite integration
async function startServer() {
  if (process.env.NODE_ENV === "development") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Mounted Vite middleware.");
  } else {
    // Robust path resolution: in production, server.cjs lives in dist/ so __dirname is dist.
    // Otherwise, if run directly from root, fallback to process.cwd() / dist.
    const distPath = __dirname.endsWith("dist") 
      ? __dirname 
      : path.join(process.cwd(), "dist");
    
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SkyIT Ventures Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
