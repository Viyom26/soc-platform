import os
import datetime
from scapy.all import sniff, IP, IPv6
import requests
import socket

# 🔥 REPLACE THIS LINE
SERVER_URL = os.getenv(
    "SOC_SERVER_URL",
    "http://127.0.0.1:8000/live-network/stream"
)

hostname = socket.gethostname()

def process_packet(packet):

    # IPv4
    if IP in packet:
        data = {
            "source_ip": packet[IP].src,
            "destination_ip": packet[IP].dst,
            "protocol": "IPv4",

            # 🔥 ADD THESE
            "source_port": getattr(packet[IP], "sport", 0),
            "destination_port": getattr(packet[IP], "dport", 0),
        }
        
    # IPv6
    elif IPv6 in packet:
        data = {
            "source_ip": packet[IPv6].src,
            "destination_ip": packet[IPv6].dst,
            "protocol": "IPv6",

            # 🔥 ADD THESE
            "source_port": getattr(packet[IPv6], "sport", 0),
            "destination_port": getattr(packet[IPv6], "dport", 0),
        }

    else:
        return

    data["event_time"] = datetime.datetime.utcnow().isoformat()
    print("SENDING:", data)

    try:
        requests.post(SERVER_URL, json=data)
    except Exception as e:
        print("ERROR:", e)

print("🚀 Sniffer started...")
sniff(prn=process_packet, store=False)