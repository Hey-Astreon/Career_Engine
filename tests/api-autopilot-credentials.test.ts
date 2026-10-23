import { describe, it, expect, beforeEach } from "vitest";
import { GET as getCredentials, POST as postCredentials, DELETE as deleteCredentials } from "../src/app/api/autopilot/credentials/route";
import { generateAutopilotToken } from "@/lib/autopilot/tokenUtils";
import { db } from "@/lib/db";

describe("AstrePilot Credential Vault API", () => {
  let userId: string;
  let authToken: string;

  beforeEach(async () => {
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: {
          name: "Roushan Kumar",
          email: "playboxstation460@gmail.com",
        },
      });
    }
    userId = user.id;
    authToken = generateAutopilotToken(userId);
  });

  it("should reject unauthenticated requests with 401", async () => {
    const req = new Request("http://localhost:3000/api/autopilot/credentials");
    const res = await getCredentials(req);
    expect(res.status).toBe(401);
  });

  it("should generate compliant passwords on demand", async () => {
    const req = new Request("http://localhost:3000/api/autopilot/credentials?generate=true", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const res = await getCredentials(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.password).toBeDefined();
    expect(data.password.length).toBe(16);
  });

  it("should save, retrieve by domain, and decrypt credentials securely", async () => {
    const testSite = "https://careers-cotiviti.icims.com/jobs/123/apply";
    const testLogin = "roushan_test@gmail.com";
    const testPassword = "CotivitiVaultPass2026!";

    // 1. Save credential
    const postReq = new Request("http://localhost:3000/api/autopilot/credentials", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        siteUrl: testSite,
        loginId: testLogin,
        password: testPassword,
        notes: "Cotiviti Portal Test",
      }),
    });
    const postRes = await postCredentials(postReq);
    expect(postRes.status).toBe(200);
    const postData = await postRes.json();
    expect(postData.success).toBe(true);
    expect(postData.credential.sitePattern).toBe("careers-cotiviti.icims.com");

    // 2. Query credential by exact host
    const getReq = new Request("http://localhost:3000/api/autopilot/credentials?siteUrl=careers-cotiviti.icims.com", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const getRes = await getCredentials(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.credential).toBeDefined();
    expect(getData.credential.loginId).toBe(testLogin);
    expect(getData.credential.password).toBe(testPassword); // Verified decrypted lossless match

    // 3. Query all credentials
    const allReq = new Request("http://localhost:3000/api/autopilot/credentials", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const allRes = await getCredentials(allReq);
    expect(allRes.status).toBe(200);
    const allData = await allRes.json();
    expect(Array.isArray(allData.credentials)).toBe(true);
    expect(allData.credentials.some((c: any) => c.sitePattern === "careers-cotiviti.icims.com")).toBe(true);

    // 4. Delete credential
    const deleteReq = new Request(`http://localhost:3000/api/autopilot/credentials?id=${postData.credential.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const delRes = await deleteCredentials(deleteReq);
    expect(delRes.status).toBe(200);
  });
});
