"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string;
  difficulty: string;
  image_url: string | null;
  is_private: boolean;
  kitchen_id: string | null;
  celebration_id: string | null;
  cooking_id: string | null;
  portion: number;
  calorific: number | null;
  cooking_time: number;
  createdAt: string;
  User: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
  };
  Kitchen: {
    id: string;
    name: string;
  } | null;
}

interface FeedCardProps {
  recipe: Recipe;}

export default function FeedCard({recipe} : FeedCardProps) {

  return (
        <div className="rounded-lg w-full flex flex-col bg-white border border-umami-light-gray/50 p-4">
            <div className="">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                    <Image 
                        width={40} 
                        height={40} 
                        src="/avatar.jpg" 
                        className="w-full h-full object-cover"
                        alt="avatar" 
                    />
                </div>
                <p>Имя Фамилия</p>
            </div>
        </div>
  );
}