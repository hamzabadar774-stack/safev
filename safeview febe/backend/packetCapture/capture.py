#!/usr/bin/env python3
"""
SafeView packet capture bridge.

Uses PyShark (a Python wrapper around tshark) to sniff a network interface,
extracts a compact packet record, and POSTs it to the Node backend at
/capture/packet where the detection service persists + evaluates it.

Requirements:
    pip install pyshark requests
    Wireshark / tshark must be installed on the host.

Usage:
    sudo python3 capture.py --interface eth0
    sudo python3 capture.py --interface Wi-Fi --backend http://localhost:4000
    python3 capture.py --pcap sample.pcap    # replay a capture file

On Windows the interface name is typically "Wi-Fi" or "Ethernet"; on macOS
"en0"; on Linux "eth0" / "wlan0". Root/administrator is required for live
capture.
"""
import argparse
import sys
import time

try:
    import pyshark
except ImportError:
    print("pyshark is not installed. Run: pip install pyshark", file=sys.stderr)
    sys.exit(1)

try:
    import requests
except ImportError:
    print("requests is not installed. Run: pip install requests", file=sys.stderr)
    sys.exit(1)


def extract(packet):
    """Reduce a pyshark packet to the fields the detection engine needs."""
    try:
        length = int(getattr(packet, "length", 0) or 0)
    except Exception:
        length = 0

    src = dst = None
    if hasattr(packet, "ip"):
        src = packet.ip.src
        dst = packet.ip.dst
    elif hasattr(packet, "ipv6"):
        src = packet.ipv6.src
        dst = packet.ipv6.dst

    proto = packet.highest_layer if hasattr(packet, "highest_layer") else "UNKNOWN"
    sport = dport = 0
    flags = None
    if hasattr(packet, "tcp"):
        sport = int(packet.tcp.srcport)
        dport = int(packet.tcp.dstport)
        proto = "TCP"
        flag_bits = []
        for name in ("flags_syn", "flags_ack", "flags_fin", "flags_rst", "flags_push", "flags_urg"):
            v = getattr(packet.tcp, name, None)
            if v and str(v) in ("1", "True", "true"):
                flag_bits.append(name.replace("flags_", "").upper())
        flags = ",".join(flag_bits) if flag_bits else None
    elif hasattr(packet, "udp"):
        sport = int(packet.udp.srcport)
        dport = int(packet.udp.dstport)
        proto = "UDP"

    return {
        "timestamp": getattr(packet, "sniff_time", None).isoformat() if getattr(packet, "sniff_time", None) else None,
        "source_ip": src or "0.0.0.0",
        "destination_ip": dst or "0.0.0.0",
        "protocol": proto,
        "source_port": sport,
        "destination_port": dport,
        "packet_size": length,
        "flags": flags,
    }


def send(backend, record):
    try:
        r = requests.post(f"{backend.rstrip('/')}/capture/packet", json=record, timeout=5)
        if r.status_code >= 400:
            print(f"[warn] backend {r.status_code}: {r.text[:200]}", file=sys.stderr)
    except Exception as e:
        print(f"[warn] failed to post packet: {e}", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description="SafeView packet capture -> backend bridge")
    ap.add_argument("--interface", "-i", help="Network interface to sniff (e.g. eth0, Wi-Fi)")
    ap.add_argument("--pcap", help="Read from a pcap file instead of live capture")
    ap.add_argument("--backend", "-b", default="http://localhost:4000", help="Backend base URL")
    ap.add_argument("--bpf", default=None, help="Optional BPF filter, e.g. 'tcp or udp'")
    ap.add_argument("--count", type=int, default=0, help="Stop after N packets (0 = unlimited)")
    args = ap.parse_args()

    if args.pcap:
        cap = pyshark.FileCapture(args.pcap, display_filter=None)
        print(f"[info] replaying {args.pcap}")
    else:
        if not args.interface:
            ap.error("--interface is required for live capture")
        cap = pyshark.LiveCapture(interface=args.interface, bpf_filter=args.bpf)
        print(f"[info] capturing on {args.interface} -> {args.backend}")

    sent = 0
    started = time.time()
    try:
        for packet in cap.sniff_continuously() if hasattr(cap, "sniff_continuously") else cap:
            record = extract(packet)
            send(args.backend, record)
            sent += 1
            if args.count and sent >= args.count:
                break
    except KeyboardInterrupt:
        pass
    finally:
        elapsed = time.time() - started
        print(f"[info] captured {sent} packets in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
