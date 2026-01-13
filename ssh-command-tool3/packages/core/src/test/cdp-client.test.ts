import { describe, test, expect } from "bun:test";
import {
  formatNetworkReport,
  formatPerformanceReport,
  type NetworkRequest,
  type PerformanceEntry,
} from "../cdp-client";

describe("CDP Client Formatters", () => {
  describe("formatNetworkReport", () => {
    test("should format empty requests", () => {
      const report = formatNetworkReport([]);
      expect(report).toContain("=== Network Recording Report ===");
      expect(report).toContain("Total Requests: 0");
      expect(report).toContain("Total Size: 0 B");
    });

    test("should format single request", () => {
      const requests: NetworkRequest[] = [
        {
          requestId: "1",
          url: "https://example.com/api/data",
          method: "GET",
          timestamp: 1000,
          type: "XHR",
          response: {
            status: 200,
            statusText: "OK",
            headers: {},
          },
          encodedDataLength: 1024,
        },
      ];

      const report = formatNetworkReport(requests);
      expect(report).toContain("[GET] https://example.com/api/data");
      expect(report).toContain("Status: 200");
      expect(report).toContain("1.0 KB");
      expect(report).toContain("Type: XHR");
      expect(report).toContain("Total Requests: 1");
    });

    test("should format multiple requests and sum sizes", () => {
      const requests: NetworkRequest[] = [
        {
          requestId: "1",
          url: "https://example.com/1",
          method: "GET",
          timestamp: 1000,
          encodedDataLength: 1024,
        },
        {
          requestId: "2",
          url: "https://example.com/2",
          method: "POST",
          timestamp: 1001,
          encodedDataLength: 2048,
        },
      ];

      const report = formatNetworkReport(requests);
      expect(report).toContain("Total Requests: 2");
      expect(report).toContain("Total Size: 3.0 KB");
    });

    test("should handle pending requests", () => {
      const requests: NetworkRequest[] = [
        {
          requestId: "1",
          url: "https://example.com/pending",
          method: "GET",
          timestamp: 1000,
        },
      ];

      const report = formatNetworkReport(requests);
      expect(report).toContain("Status: pending");
    });
  });

  describe("formatPerformanceReport", () => {
    test("should format empty entries", () => {
      const report = formatPerformanceReport([]);
      expect(report).toContain("=== Performance Recording Report ===");
      expect(report).toContain("No performance data recorded");
    });

    test("should format performance entries", () => {
      const entries: PerformanceEntry[] = [
        {
          timestamp: 1000,
          metrics: [
            { name: "JSHeapUsedSize", value: 10 * 1024 * 1024 },
            { name: "Documents", value: 5 },
            { name: "LayoutCount", value: 10 },
          ],
        },
        {
          timestamp: 2000,
          metrics: [
            { name: "JSHeapUsedSize", value: 15 * 1024 * 1024 },
            { name: "Documents", value: 6 },
            { name: "LayoutCount", value: 15 },
          ],
        },
      ];

      const report = formatPerformanceReport(entries);
      expect(report).toContain("=== Performance Recording Report ===");
      expect(report).toContain("Latest Metrics:");
      expect(report).toContain("JSHeapUsedSize:");
      expect(report).toContain("Total Samples: 2");
      expect(report).toContain("Duration: 1.0s");
    });
  });
});
