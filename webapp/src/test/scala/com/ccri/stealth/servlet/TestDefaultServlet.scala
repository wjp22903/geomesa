package com.ccri.stealth.servlet

import java.util

import org.junit.runner.RunWith
import org.specs2.mock.Mockito
import org.specs2.mutable.Specification
import org.specs2.runner.JUnitRunner
import org.springframework.security.core.context.{SecurityContext, SecurityContextHolder}
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.Authentication

@RunWith(classOf[JUnitRunner])
class TestDefaultServlet extends Specification with Mockito {

  "getCnOrAll extracts CN from DN string" >> {
      val dn = "CN=user1,O=CCRI,L=Cville,ST=Virginia,C=US"
      DefaultServlet.getCNOrAll(dn).mustEqual("user1")
  }

  "getCnOrAll returns original if CN not present" >> {
    val dn = "firstname lastname"
    DefaultServlet.getCNOrAll(dn).mustEqual("firstname lastname")
  }

  "getAuth works with UserDetails principal" >> {

    val details = mock[UserDetails]
    details.getUsername returns "CN=user1,O=ccri"
    val auth = mock[Authentication]
    auth.getPrincipal() returns details

    DefaultServlet.parseAuth(auth) must beSome("user1")
  }

  "getAuth works with String principal" >> {

    val auth = mock[Authentication]
    auth.getPrincipal() returns "user1"

    DefaultServlet.parseAuth(auth) must beSome("user1")
  }


  "getAuth returns None for unexpected principal types" >> {

    val auth = mock[Authentication]
    auth.getPrincipal() returns new Object()

    DefaultServlet.parseAuth(auth) must beNone
  }

  "getUser works" >> {

    val details = mock[UserDetails]
    details.getUsername returns "CN=user1,O=ccri"

    val auth = mock[Authentication]
    auth.getPrincipal() returns details

    val context = mock[SecurityContext]
    context.getAuthentication returns auth

    SecurityContextHolder.setContext(context)

    DefaultServlet.getUser must beSome("user1")
  }

  "getUser returns None if auth is null" >> {

    val context = mock[SecurityContext]
    context.getAuthentication returns null

    SecurityContextHolder.setContext(context)

    DefaultServlet.getUser must beNone
  }

  "getUser returns None if details is null" >> {

    val auth = mock[Authentication]
    auth.getPrincipal() returns null

    val context = mock[SecurityContext]
    context.getAuthentication returns auth

    SecurityContextHolder.setContext(context)

    DefaultServlet.getUser must beNone
  }

}
