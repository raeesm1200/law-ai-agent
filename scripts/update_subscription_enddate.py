"""
Script to update a subscription's end_date in the local database.
Usage:
  python scripts/update_subscription_enddate.py --stripe sub_123 --end "2025-10-05T09:49:20"
  python scripts/update_subscription_enddate.py --id 7 --end "2025-10-05T09:49:20"

This script uses the project's database configuration and models.
"""
import argparse
from datetime import datetime
import os
import sys

# Ensure project root is on sys.path so relative imports work when running the script directly
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from database import SessionLocal
from models import Subscription


def parse_args():
    p = argparse.ArgumentParser(description='Update subscription end_date')
    p.add_argument('--stripe', help='Stripe subscription id (stripe_subscription_id)')
    p.add_argument('--id', type=int, help='Local subscription id')
    p.add_argument('--end', required=True, help='New end_date in ISO format, e.g. 2025-10-05T09:49:20')
    return p.parse_args()


def main():
    args = parse_args()

    try:
        new_dt = datetime.fromisoformat(args.end)
    except Exception as e:
        print('Invalid end datetime:', e)
        return

    db = SessionLocal()
    try:
        sub = None
        if args.id:
            sub = db.query(Subscription).filter(Subscription.id == args.id).first()
        elif args.stripe:
            sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == args.stripe).first()
        else:
            print('Please provide --id or --stripe')
            return

        if not sub:
            print('Subscription not found')
            return

        print(f'Before: id={sub.id}, stripe={sub.stripe_subscription_id}, status={sub.status}, end_date={sub.end_date}')
        sub.end_date = new_dt
        db.add(sub)
        db.commit()
        print(f'Updated: id={sub.id}, stripe={sub.stripe_subscription_id}, status={sub.status}, end_date={sub.end_date}')
    finally:
        db.close()

if __name__ == '__main__':
    main()
