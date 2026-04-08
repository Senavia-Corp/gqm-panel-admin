"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/atoms/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Invalid email or password")
        setLoading(false)
        return
      }

      localStorage.setItem("access_token", data.access_token)
      localStorage.setItem("refresh_token", data.refresh_token)
      localStorage.setItem("token_type", data.token_type)
      localStorage.setItem("user_id", data.user_id)
      localStorage.setItem("user_type", data.user_type)
      localStorage.setItem("login_time", Date.now().toString()) // Store login time for token expiry

      // Save IAM policies if returned by the backend login endpoint
      if (data.user_data?.policies) {
        localStorage.setItem("user_policies", JSON.stringify(data.user_data.policies))
      }

      const role = data.user_type === "member" ? "GQM_MEMBER" : "LEAD_TECHNICIAN"

      let userData
      if (data.user_type === "member") {
        // Map member data to existing User format
        userData = {
          id: data.user_data.ID_Member,
          name: data.user_data.Acc_Rep,
          email: data.user_data.Email_Address,
          role: role,
          avatar: "/placeholder.svg?height=40&width=40",
          phone: data.user_data.Phone_Number,
          address: data.user_data.Address,
        }
      } else {
        // Map technician data to existing User format
        userData = {
          id: data.user_data.ID_Technician,
          name: data.user_data.Name,
          email: data.user_data.Email_Address,
          role: role,
          avatar: "/placeholder.svg?height=40&width=40",
          phone: data.user_data.Phone_Number,
          location: data.user_data.Location,
          technicianType: data.user_data.Type_of_technician,
          subcontractorId: data.user_data.ID_Subcontractor,
        }
      }

      localStorage.setItem("user_data", JSON.stringify(userData))

      console.log("[v0] Login successful, redirecting to dashboard")
      router.push("/dashboard")
    } catch (err) {
      console.error("[v0] Login error:", err)
      setError("An error occurred during login")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Background Image */}
      <div
        className="hidden flex-1 bg-cover bg-center lg:block"
        style={{
          backgroundImage: "url(/images/login-background.jpg)",
        }}
      >
        <div className="flex h-full items-start p-12">
          <Logo className="scale-150" />
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex flex-1 items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="text-right">
              <Button type="button" variant="link" className="text-sm">
                Forgot Password?
              </Button>
            </div>

            <Button type="submit" className="w-full bg-gqm-green-dark hover:bg-gqm-green" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't you have an account? </span>
            <Button variant="link" className="p-0 underline">
              Sign up
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
